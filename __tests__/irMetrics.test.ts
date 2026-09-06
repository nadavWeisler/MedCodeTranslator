const {
  precisionAt,
  successAt,
  reciprocalRank,
  ndcgAt,
  scoreRanking,
  aggregateMetrics,
} = require('../scripts/lib/ir_metrics');

describe('IR metrics', () => {
  const ranked = ['A', 'B', 'C', 'D', 'E'];
  const relevant = new Set(['C']);

  it('computes MRR from the first relevant rank', () => {
    expect(reciprocalRank(ranked, relevant)).toBeCloseTo(1 / 3);
    expect(reciprocalRank(['Z'], relevant)).toBe(0);
  });

  it('computes true P@k, not Success@k', () => {
    expect(precisionAt(ranked, relevant, 1)).toBe(0);
    expect(precisionAt(ranked, relevant, 5)).toBeCloseTo(0.2);
    expect(successAt(ranked, relevant, 1)).toBe(0);
    expect(successAt(ranked, relevant, 5)).toBe(1);
  });

  it('computes binary nDCG@k', () => {
    const relevance = { C: 1 };
    expect(ndcgAt(ranked, relevance, 5)).toBeCloseTo(1 / Math.log2(4));
    expect(ndcgAt(['C', 'A'], relevance, 5)).toBeCloseTo(1);
    expect(ndcgAt(['A', 'B'], relevance, 5)).toBe(0);
  });

  it('aggregates per-query scores', () => {
    const rows = [
      scoreRanking(['X'], ['X'], [1, 5]),
      scoreRanking(['A', 'X'], ['X'], [1, 5]),
    ];
    const macro = aggregateMetrics(rows, [1, 5]);
    expect(macro.query_count).toBe(2);
    expect(macro.mrr).toBeCloseTo((1 + 0.5) / 2);
    expect(macro.p_at_1).toBeCloseTo(0.5);
    expect(macro.success_at_5).toBe(1);
  });
});
