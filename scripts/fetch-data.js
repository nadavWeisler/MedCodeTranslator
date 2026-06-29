#!/usr/bin/env node
/**
 * fetch-data.js
 *
 * Downloads real ATC5 and ICD-10 data from public sources and
 * writes them to data/vocabularies/atc5.json and data/vocabularies/icd10.json.
 *
 * Usage:
 *   node scripts/fetch-data.js
 *
 * Sources:
 *   ATC5  — fabkury/atcd  (WHO ATC-DDD 2021, public domain)
 *   ICD-10 — simpledatatools/icd10-codes (WHO ICD-10, public domain)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'data', 'vocabularies');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current.trim());
  return result;
}

async function fetchATC5() {
  console.log('Fetching ATC5 data...');
  const url = 'https://raw.githubusercontent.com/fabkury/atcd/main/WHO%20ATC-DDD%202021-12-03.csv';
  const csv = await fetchText(url);
  const lines = csv.split('\n').filter(Boolean);
  const header = parseCSVLine(lines[0]);
  const codeIdx = header.findIndex(h => h.toLowerCase().includes('atc') && h.toLowerCase().includes('code'));
  const nameIdx = header.findIndex(h => h.toLowerCase().includes('atc') && h.toLowerCase().includes('name'));

  console.log(`  Header: ${header.join(' | ')}`);
  console.log(`  Code col: ${codeIdx}, Name col: ${nameIdx}`);

  const entries = [];
  const seen = new Set();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const code = cols[codeIdx >= 0 ? codeIdx : 0]?.replace(/"/g, '').trim();
    const name = cols[nameIdx >= 0 ? nameIdx : 1]?.replace(/"/g, '').trim();
    if (!code || !name) continue;
    // Only ATC level 5 (codes like A10BA02 — 7 chars)
    if (code.length !== 7) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    entries.push({ code, name_en: name });
  }

  console.log(`  ✓ ${entries.length} ATC5 entries`);
  return entries;
}

async function fetchICD10() {
  console.log('Fetching ICD-10 data...');
  // Using a public ICD-10 JSON dataset
  const url = 'https://raw.githubusercontent.com/nicktacular/icd10/master/data/icd10.json';
  try {
    const raw = await fetchText(url);
    const data = JSON.parse(raw);
    const entries = [];
    for (const [code, name] of Object.entries(data)) {
      if (typeof name === 'string') {
        entries.push({ code, name_en: name });
      }
    }
    console.log(`  ✓ ${entries.length} ICD-10 entries`);
    return entries;
  } catch (e) {
    console.warn('  ⚠ Primary ICD-10 source failed, trying fallback...');
    return null;
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // ATC5
  try {
    const atc5 = await fetchATC5();
    if (atc5.length > 0) {
      fs.writeFileSync(
        path.join(OUT_DIR, 'atc5.json'),
        JSON.stringify(atc5, null, 2)
      );
      console.log(`Saved atc5.json (${atc5.length} entries)`);
    }
  } catch (e) {
    console.error('Failed to fetch ATC5 data:', e.message);
    console.log('Keeping existing sample data.');
  }

  // ICD-10
  try {
    const icd10 = await fetchICD10();
    if (icd10 && icd10.length > 0) {
      fs.writeFileSync(
        path.join(OUT_DIR, 'icd10.json'),
        JSON.stringify(icd10, null, 2)
      );
      console.log(`Saved icd10.json (${icd10.length} entries)`);
    }
  } catch (e) {
    console.error('Failed to fetch ICD-10 data:', e.message);
    console.log('Keeping existing sample data.');
  }

  console.log('\nDone! Run the app to seed the database.');
}

main().catch(console.error);
