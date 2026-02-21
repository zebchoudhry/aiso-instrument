/**
 * Static benchmark percentiles for score comparison.
 * Replace with DB-backed values when benchmark data is available.
 */
/** Approximate percentile thresholds (score -> percentile) */
const SCORE_TO_PERCENTILE: [number, number][] = [
  [0, 0], [20, 10], [35, 20], [45, 30], [55, 40], [65, 50],
  [72, 60], [78, 70], [85, 80], [92, 90], [100, 100],
];

export function getPercentile(score: number): number {
  for (let i = SCORE_TO_PERCENTILE.length - 1; i >= 0; i--) {
    if (score >= SCORE_TO_PERCENTILE[i][0]) return SCORE_TO_PERCENTILE[i][1];
  }
  return 0;
}

export function getPercentileLabel(score: number): string {
  const pct = getPercentile(score);
  if (pct >= 50) return `Top ${100 - pct}%`;
  return `Bottom ${pct}%`;
}
