/**
 * Standard IR metrics for known-item / graded retrieval.
 *
 * P@k is true precision (|relevant ∩ top-k| / k), not Success@k.
 * Success@k (hit rate) is exported separately.
 */

'use strict';

function firstRelevantRank(rankedCodes, relevantSet) {
  for (let i = 0; i < rankedCodes.length; i++) {
    if (relevantSet.has(rankedCodes[i])) return i + 1;
  }
  return null;
}

function reciprocalRank(rankedCodes, relevantSet) {
  const rank = firstRelevantRank(rankedCodes, relevantSet);
  return rank == null ? 0 : 1 / rank;
}

function precisionAt(rankedCodes, relevantSet, k) {
  if (k <= 0) return 0;
  const top = rankedCodes.slice(0, k);
  let hits = 0;
  for (const code of top) {
    if (relevantSet.has(code)) hits += 1;
  }
  return hits / k;
}

function successAt(rankedCodes, relevantSet, k) {
  return rankedCodes.slice(0, k).some((code) => relevantSet.has(code)) ? 1 : 0;
}

function dcgAt(gains, k) {
  let dcg = 0;
  const n = Math.min(k, gains.length);
  for (let i = 0; i < n; i++) {
    const rel = gains[i];
    if (rel <= 0) continue;
    dcg += (Math.pow(2, rel) - 1) / Math.log2(i + 2);
  }
  return dcg;
}

function ndcgAt(rankedCodes, relevance, k) {
  const gains = rankedCodes.slice(0, k).map((code) => relevance[code] || 0);
  const ideal = Object.values(relevance)
    .filter((rel) => rel > 0)
    .sort((a, b) => b - a);
  const dcg = dcgAt(gains, k);
  const idcg = dcgAt(ideal, k);
  return idcg === 0 ? 0 : dcg / idcg;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scoreRanking(rankedCodes, relevantCodes, kValues = [1, 5, 10]) {
  const relevantSet = new Set(relevantCodes);
  const relevance = {};
  for (const code of relevantCodes) relevance[code] = 1;

  const metrics = {
    mrr: reciprocalRank(rankedCodes, relevantSet),
    first_relevant_rank: firstRelevantRank(rankedCodes, relevantSet),
  };

  for (const k of kValues) {
    metrics[`p_at_${k}`] = precisionAt(rankedCodes, relevantSet, k);
    metrics[`success_at_${k}`] = successAt(rankedCodes, relevantSet, k);
    metrics[`ndcg_at_${k}`] = ndcgAt(rankedCodes, relevance, k);
  }

  return metrics;
}

function aggregateMetrics(perQuery, kValues = [1, 5, 10]) {
  const keys = ['mrr', ...kValues.flatMap((k) => [`p_at_${k}`, `success_at_${k}`, `ndcg_at_${k}`])];
  const out = { query_count: perQuery.length };
  for (const key of keys) {
    out[key] = mean(perQuery.map((row) => row[key] || 0));
  }
  return out;
}

function roundMetrics(metrics, digits = 4) {
  const out = {};
  for (const [key, value] of Object.entries(metrics)) {
    out[key] = typeof value === 'number' ? Number(value.toFixed(digits)) : value;
  }
  return out;
}

module.exports = {
  firstRelevantRank,
  reciprocalRank,
  precisionAt,
  successAt,
  dcgAt,
  ndcgAt,
  mean,
  scoreRanking,
  aggregateMetrics,
  roundMetrics,
};
