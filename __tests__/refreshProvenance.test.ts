import { SHIPPED_DATASETS, validateShippedRecordMap } from '../scripts/lib/provenance';

const fs = require('fs') as {
  mkdtempSync(prefix: string): string;
  writeFileSync(file: string, data: string): void;
  readFileSync(file: string, encoding: string): string;
};
const os = require('os') as { tmpdir(): string };
const path = require('path') as { join(...parts: string[]): string };
const { spawnSync } = require('child_process') as {
  spawnSync: (
    cmd: string,
    args: string[],
    opts: { encoding: string }
  ) => { status: number | null; stderr: string; stdout: string };
};

const CMS = 'cms';
const CHEMBL = 'chembl';
const LOINC = 'loinc';
const HAND = 'hand-entered';
const AGENT = 'agent-authored';
const CDC = 'cdc';

function source(dataset: string, provenanceKey: string, extra: Record<string, unknown> = {}) {
  return {
    dataset,
    provenance_key: provenanceKey,
    provider: 'fixture',
    url: 'https://example.test/source',
    dataset_version: 'committed',
    source_revision: 'committed',
    record_count: 1,
    ...extra,
  };
}

describe('refresh metadata writer', () => {
  it('keeps provenance keys so the provenance check still passes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medcode-refresh-'));
    const existing = {
      generated_at_utc: '2026-07-06T05:07:27+00:00',
      imported_by: 'scripts/fetch_public_vocabularies.py',
      provenance_keys: {
        [CMS]: {
          kind: 'retrieved',
          label_key: 'source_chip_cms',
          authoritative: true,
          url: 'https://www.cms.gov/medicare/coding-billing/icd-10-codes',
        },
        [CHEMBL]: {
          kind: 'third-party',
          label_key: 'source_chip_chembl',
          authoritative: true,
          url_template: 'https://atcddd.fhi.no/atc_ddd_index/?code={code}',
        },
        [LOINC]: {
          kind: 'third-party',
          label_key: 'source_chip_ohdsi',
          authoritative: true,
          url_template: 'https://loinc.org/{code}',
        },
        [HAND]: {
          kind: 'hand-entered',
          label_key: 'source_chip_hand_entered',
          authoritative: false,
        },
        [AGENT]: {
          kind: 'agent-authored',
          label_key: 'source_chip_agent_authored',
          authoritative: false,
        },
        [CDC]: {
          kind: 'retrieved',
          label_key: 'source_chip_cdc',
          authoritative: true,
          url: 'https://www2.cdc.gov/vaccines/iis/iisstandards/downloads/cvx.txt',
        },
      },
      sources: [
        source('atc1', CHEMBL),
        source('atc2', CHEMBL),
        source('atc3', CHEMBL),
        source('atc4', CHEMBL),
        source('atc5', CHEMBL),
        source('icd10', CMS, {
          hebrew_provenance_key: HAND,
          translation_required: true,
          hebrew_label_count: 1,
        }),
        source('icd9', CMS),
        source('icd11', HAND),
        source('loinc', LOINC),
        source('hcpcs', CMS),
        source('cvx', CDC),
        source('icd9_to_icd10_gem', AGENT),
        source('common_scheme_mappings', HAND),
      ],
    };

    const recordMap: Record<string, unknown[]> = {};
    for (const [fileName, dataset] of SHIPPED_DATASETS) {
      if (dataset === 'icd10') {
        recordMap[dataset] = [{
          code: 'E11.9',
          name_en: 'Type 2 diabetes mellitus',
          name_he: 'סוכרת',
          translation: {
            method: 'Unofficial translation, not validated',
            reviewed: false,
            english_source: CMS,
          },
        }];
      } else if (dataset === 'icd9_to_icd10_gem') {
        recordMap[dataset] = [{
          icd9_code: '250.00',
          icd10_code: 'E11.9',
          cardinality: '1:1',
          is_one_to_one: true,
          is_one_to_many: false,
          is_many_to_one: false,
        }];
      } else if (dataset === 'common_scheme_mappings') {
        recordMap[dataset] = [{
          source_scheme: 'icd10',
          target_scheme: 'icd11',
          source_code: 'E11.9',
          target_code: '5A11',
          is_common: true,
          mapping_source: 'Hand-entered',
        }];
      } else {
        recordMap[dataset] = [{ code: 'A00', name_en: 'Example' }];
      }
      fs.writeFileSync(path.join(dir, fileName), JSON.stringify(recordMap[dataset]));
    }

    const existingPath = path.join(dir, 'source-metadata.json');
    const fetchedPath = path.join(dir, 'fetched.json');
    const writtenPath = path.join(dir, 'written-source-metadata.json');
    fs.writeFileSync(existingPath, JSON.stringify(existing));
    // Same shape the refresh builds: no provenance_key, and a crosswalk name
    // that is not the shipped dataset id.
    fs.writeFileSync(fetchedPath, JSON.stringify([
      { dataset: 'icd10', provider: 'CMS', url: 'https://example.test/icd10', dataset_version: 'refresh', source_revision: 'refresh', record_count: 1 },
      { dataset: 'icd9', provider: 'NBER', url: 'https://example.test/icd9', dataset_version: 'refresh', source_revision: 'refresh', record_count: 1 },
      { dataset: 'atc5', provider: 'ChEMBL/EBI', url: 'https://example.test/atc', dataset_version: 'refresh', source_revision: 'refresh', record_count: 1 },
      { dataset: 'hcpcs', provider: 'CMS', url: 'https://example.test/hcpcs', dataset_version: 'refresh', source_revision: 'refresh', record_count: 1 },
      { dataset: 'cvx', provider: 'CDC', url: 'https://example.test/cvx', dataset_version: 'refresh', source_revision: 'refresh', record_count: 1 },
      { dataset: 'crosswalk', provider: 'CMS/NBER', url: 'https://example.test/gem', dataset_version: 'refresh', source_revision: 'refresh', record_count: 1 },
    ]));

    const py = spawnSync('python3', [
      '-c',
      [
        'import json, sys',
        'from pathlib import Path',
        'sys.path.insert(0, sys.argv[1])',
        'from refresh_medical_db import build_refresh_metadata',
        'existing = json.loads(Path(sys.argv[2]).read_text())',
        'fetched = json.loads(Path(sys.argv[3]).read_text())',
        'written = build_refresh_metadata(existing, fetched, "2026-01-01T00:00:00+00:00")',
        'Path(sys.argv[4]).write_text(json.dumps(written))',
      ].join('\n'),
      path.join(process.cwd(), 'scripts'),
      existingPath,
      fetchedPath,
      writtenPath,
    ], { encoding: 'utf8' });

    expect(py.status).toBe(0);
    if (py.status !== 0) {
      throw new Error(py.stderr || py.stdout);
    }

    const written = JSON.parse(fs.readFileSync(writtenPath, 'utf8'));
    const errors = validateShippedRecordMap(recordMap, written);
    expect(errors).toEqual([]);
  });
});
