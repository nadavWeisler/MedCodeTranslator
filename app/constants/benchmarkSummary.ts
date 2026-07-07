/** Public benchmark summary for marketing / research pages (layered vs SQLite). */
export type BenchmarkRow = {
  scheme: string;
  label: string;
  fixtures: number;
  layeredP1: number;
  sqliteP1: number;
};

export const BENCHMARK_GENERATED_AT = '2026-07-06';

export const BENCHMARK_ROWS: BenchmarkRow[] = [
  { scheme: 'atc5', label: 'ATC-5', fixtures: 12, layeredP1: 0.83, sqliteP1: 0.75 },
  { scheme: 'icd10', label: 'ICD-10-CM', fixtures: 12, layeredP1: 1.0, sqliteP1: 0.67 },
  { scheme: 'icd9', label: 'ICD-9-CM', fixtures: 8, layeredP1: 1.0, sqliteP1: 0.88 },
  { scheme: 'icd11', label: 'ICD-11', fixtures: 9, layeredP1: 0.89, sqliteP1: 0.89 },
  { scheme: 'loinc', label: 'LOINC', fixtures: 10, layeredP1: 1.0, sqliteP1: 0.4 },
  { scheme: 'cpt', label: 'CPT (demo)', fixtures: 8, layeredP1: 1.0, sqliteP1: 0.75 },
  { scheme: 'hcpcs', label: 'HCPCS', fixtures: 7, layeredP1: 1.0, sqliteP1: 0.86 },
  { scheme: 'cvx', label: 'CVX', fixtures: 8, layeredP1: 0.75, sqliteP1: 0.5 },
];

export const BENCHMARK_MEAN_LAYERED_P1 = 0.95;
export const BENCHMARK_MEAN_SQLITE_P1 = 0.71;
export const BENCHMARK_TOTAL_FIXTURES = 82;
