#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { SHIPPED_DATASETS, resolveChip, resolveTranslationChip, validateShippedRecordMap } = require('./lib/provenance');

function loadShippedRecords(rootDir) {
  const vocabDir = path.join(rootDir, 'data', 'vocabularies');
  const recordMap = {};
  for (const [fileName, dataset] of SHIPPED_DATASETS) {
    const filePath = path.join(vocabDir, fileName);
    if (!fs.existsSync(filePath)) continue;
    recordMap[dataset] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return recordMap;
}

function validateShippedProvenance(rootDir) {
  return validateShippedRecordMap(loadShippedRecords(rootDir));
}

function summarize(recordMap) {
  for (const [, dataset] of SHIPPED_DATASETS) {
    const records = recordMap[dataset] || [];
    let authoritative = 0;
    let unverified = 0;
    let translated = 0;
    for (const record of records) {
      const code = record.code || null;
      const chip = resolveChip(dataset, code, 'record');
      if (chip && chip.authoritative && chip.href) authoritative += 1;
      else unverified += 1;
      if (resolveTranslationChip(dataset, code) && record.name_he && String(record.name_he).trim()) {
        translated += 1;
      }
    }
    console.log(
      `${dataset}: rows=${records.length} authoritative_link=${authoritative} unverified_chip=${unverified} translated_chip=${translated}`
    );
  }
}

const root = path.resolve(__dirname, '..');
const recordMap = loadShippedRecords(root);
const errors = validateShippedRecordMap(recordMap);

if (errors.length > 0) {
  console.error('Provenance validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Provenance validation passed for ${SHIPPED_DATASETS.length} shipped datasets.`);
summarize(recordMap);
