'use strict';

/**
 * System-level provenance for shipped terminology records.
 *
 * A dataset key in source-metadata.json covers every row in that file.
 * Records may set `provenance` to another key; they must not leave it blank.
 * Long citations stay on the key. Vocabulary values are not stored here.
 */

const PROVENANCE_KINDS = ['retrieved', 'third-party', 'hand-entered', 'agent-authored'];

const SHIPPED_DATASETS = [
  ['atc1.json', 'atc1'],
  ['atc2.json', 'atc2'],
  ['atc3.json', 'atc3'],
  ['atc4.json', 'atc4'],
  ['atc5.json', 'atc5'],
  ['icd10.json', 'icd10'],
  ['icd9.json', 'icd9'],
  ['icd11.json', 'icd11'],
  ['loinc.json', 'loinc'],
  ['hcpcs.json', 'hcpcs'],
  ['cvx.json', 'cvx'],
  ['icd9_to_icd10_gem.json', 'icd9_to_icd10_gem'],
  ['common_scheme_mappings.json', 'common_scheme_mappings'],
];

function loadMetadata(metadata) {
  if (metadata) return metadata;
  return require('../../data/vocabularies/source-metadata.json');
}

function sourceFor(metadata, dataset) {
  const sources = metadata.sources || [];
  return sources.find((entry) => entry.dataset === dataset) || null;
}

function registryEntry(metadata, key) {
  if (!key || typeof key !== 'string') return null;
  const registry = metadata.provenance_keys || {};
  return registry[key] || null;
}

function recordId(record, index) {
  if (record && typeof record.code === 'string' && record.code) return record.code;
  if (record && record.icd9_code && record.icd10_code) {
    return `${record.icd9_code}->${record.icd10_code}`;
  }
  if (record && record.source_code && record.target_code) {
    return `${record.source_scheme || '?'}:${record.source_code}->${record.target_code}`;
  }
  return `#${index}`;
}

function hasHebrewLabel(record) {
  return Boolean(record) && typeof record.name_he === 'string' && record.name_he.trim().length > 0;
}

function chipHref(entry, code) {
  if (!entry) return null;
  if (typeof entry.url_template === 'string' && entry.url_template && code) {
    return fillTemplate(entry.url_template, code);
  }
  if (typeof entry.url === 'string' && entry.url) return entry.url;
  return null;
}

/**
 * A translated label counts as covered only when `translation.english_source`
 * resolves to the English record's provenance key and that key has a link.
 */
function translationLinkErrors(metadata, source, record, where) {
  const translation = record.translation;
  if (!translation || typeof translation !== 'object' || Array.isArray(translation)) {
    return [`${where}: translated label does not link to its English source record`];
  }
  const errors = [];
  if (translation.reviewed !== false) {
    errors.push(`${where}: translation.reviewed must be false`);
  }
  if (typeof translation.method !== 'string' || !translation.method.trim()) {
    errors.push(`${where}: translation.method is missing`);
  }
  const englishSource = typeof translation.english_source === 'string'
    ? translation.english_source.trim()
    : '';
  const datasetKey = typeof source.provenance_key === 'string' ? source.provenance_key.trim() : '';
  if (!englishSource || englishSource !== datasetKey) {
    errors.push(`${where}: translated label does not link to its English source record`);
    return errors;
  }
  const href = chipHref(registryEntry(metadata, englishSource), record.code);
  if (!href) {
    errors.push(`${where}: translated label does not link to its English source record`);
  }
  return errors;
}

function keyErrors(metadata, key, where) {
  const entry = registryEntry(metadata, key);
  if (!entry) return [`${where} provenance key "${key || ''}" is not in provenance_keys`];
  const errors = [];
  if (!PROVENANCE_KINDS.includes(entry.kind)) {
    errors.push(`${where} provenance key "${key}" has unknown kind "${entry.kind}"`);
  }
  if (typeof entry.label_key !== 'string' || !entry.label_key.trim()) {
    errors.push(`${where} provenance key "${key}" is missing label_key`);
  }
  const authoritative = entry.authoritative === true;
  if (entry.kind === 'hand-entered' || entry.kind === 'agent-authored') {
    if (authoritative) {
      errors.push(`${where} provenance key "${key}" is ${entry.kind} and must not be authoritative`);
    }
    if (entry.url_template) {
      errors.push(`${where} provenance key "${key}" is ${entry.kind} and must not use a per-code authoritative template`);
    }
  } else if (entry.kind === 'retrieved' || entry.kind === 'third-party') {
    if (!authoritative) {
      errors.push(`${where} provenance key "${key}" must be authoritative`);
    }
    if (!entry.url && !entry.url_template) {
      errors.push(`${where} provenance key "${key}" is missing a link`);
    }
  }
  if (entry.url_template && !String(entry.url_template).includes('{code}')) {
    errors.push(`${where} provenance key "${key}" url_template must include {code}`);
  }
  return errors;
}

/**
 * Errors for one dataset's records. An empty list means every record resolves.
 * A record with no dataset key and no `provenance` field fails.
 * A blank `provenance` field fails even when the dataset has a key.
 */
function validateDatasetRecords(dataset, records, metadata) {
  const resolved = loadMetadata(metadata);
  const errors = [];
  if (!Array.isArray(records)) {
    return [`${dataset}: shipped records must be an array`];
  }
  const source = sourceFor(resolved, dataset);
  if (!source) {
    errors.push(`${dataset}: no source-metadata entry for ${records.length} record(s)`);
  }
  const datasetKey = source && typeof source.provenance_key === 'string' ? source.provenance_key.trim() : '';
  if (source && !datasetKey) {
    errors.push(`${dataset}: source entry has no provenance_key`);
  } else if (datasetKey) {
    errors.push(...keyErrors(resolved, datasetKey, dataset));
  }

  let hebrewCount = 0;
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const id = recordId(record, index);
    const where = `${dataset} ${id}`;
    if (record && Object.prototype.hasOwnProperty.call(record, 'provenance')) {
      const override = record.provenance;
      if (typeof override !== 'string' || !override.trim()) {
        errors.push(`${where}: blank provenance`);
      } else if (!registryEntry(resolved, override.trim())) {
        errors.push(`${where}: unknown provenance "${override}"`);
      }
    } else if (!datasetKey || !registryEntry(resolved, datasetKey)) {
      errors.push(`${where}: missing provenance`);
    }

    if (hasHebrewLabel(record) && source && source.translation_required === true) {
      hebrewCount += 1;
      errors.push(...translationLinkErrors(resolved, source, record, where));
    }
  }

  if (source && hebrewCount > 0 && source.hebrew_label_count !== hebrewCount) {
    errors.push(
      `${dataset}: hebrew_label_count is ${source.hebrew_label_count}, file has ${hebrewCount} non-empty name_he values`
    );
  }
  return errors;
}

function validateShippedRecordMap(recordMap, metadata) {
  const resolved = loadMetadata(metadata);
  const errors = [];
  if (!resolved.provenance_keys || typeof resolved.provenance_keys !== 'object') {
    errors.push('source-metadata.json is missing provenance_keys');
  }
  for (const [fileName, dataset] of SHIPPED_DATASETS) {
    if (!Object.prototype.hasOwnProperty.call(recordMap, dataset)) {
      errors.push(`${dataset}: missing shipped file ${fileName}`);
      continue;
    }
    errors.push(...validateDatasetRecords(dataset, recordMap[dataset], resolved));
  }
  return errors;
}

function fillTemplate(template, code) {
  const encoded = encodeURIComponent(code);
  return String(template).split('{code}').join(encoded);
}

function resolveChip(dataset, code, role, metadata) {
  const resolved = loadMetadata(metadata);
  const source = sourceFor(resolved, dataset);
  if (!source) return null;
  if (role === 'hebrew') return resolveTranslationChip(dataset, code, resolved);
  const rawKey = source.provenance_key;
  if (typeof rawKey !== 'string' || !rawKey.trim()) return null;
  const key = rawKey.trim();
  const entry = registryEntry(resolved, key);
  if (!entry) return null;
  return {
    dataset,
    provenanceKey: key,
    kind: entry.kind,
    labelKey: entry.label_key,
    authoritative: entry.authoritative === true,
    href: chipHref(entry, code),
    translated: false,
  };
}

function resolveTranslationChip(dataset, code, metadata) {
  const resolved = loadMetadata(metadata);
  const source = sourceFor(resolved, dataset);
  if (!source || source.translation_required !== true) return null;
  const labelKeyName = typeof source.hebrew_provenance_key === 'string' ? source.hebrew_provenance_key.trim() : '';
  const labelEntry = registryEntry(resolved, labelKeyName);
  const englishKey = typeof source.provenance_key === 'string' ? source.provenance_key.trim() : '';
  const href = chipHref(registryEntry(resolved, englishKey), code);
  if (!labelEntry || !href) return null;
  return {
    dataset,
    provenanceKey: englishKey,
    kind: labelEntry.kind,
    labelKey: labelEntry.label_key,
    authoritative: false,
    href,
    translated: true,
  };
}

function chipForConversion(relation, targetScheme, targetCode, metadata) {
  switch (relation) {
    case 'crosswalk':
      return resolveChip('icd9_to_icd10_gem', null, 'record', metadata);
    case 'mapping':
      return resolveChip('common_scheme_mappings', null, 'record', metadata);
    case 'hierarchy':
      return resolveChip(targetScheme, targetCode, 'record', metadata);
    default: {
      const unexpected = relation;
      throw new Error(`Unknown conversion relation: ${String(unexpected)}`);
    }
  }
}

module.exports = {
  PROVENANCE_KINDS,
  SHIPPED_DATASETS,
  validateDatasetRecords,
  validateShippedRecordMap,
  resolveChip,
  resolveTranslationChip,
  chipForConversion,
};
