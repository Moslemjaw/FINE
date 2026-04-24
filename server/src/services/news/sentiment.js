/**
 * Lightweight Keyword-Based Sentiment Scorer
 * Returns score ∈ [-1, 1] for each article.
 * Designed for Kuwait/GCC financial news context.
 */

const POSITIVE_WORDS = new Set([
  'growth', 'gain', 'surge', 'upgrade', 'strong', 'profit', 'recovery',
  'expansion', 'optimism', 'rally', 'boost', 'rise', 'dividend', 'surplus',
  'record', 'milestone', 'approve', 'investment', 'partnership', 'landmark',
  'innovative', 'breakthrough', 'awarded', 'success', 'outperform', 'bullish',
  'uptick', 'rebound', 'confident', 'thriving', 'momentum', 'accelerate',
  'diversification', 'acquisition', 'ipo', 'listing', 'upgrade', 'stable',
  'resilient', 'robust', 'exceed', 'beat', 'positive', 'jump', 'climb',
]);

const NEGATIVE_WORDS = new Set([
  'risk', 'war', 'attack', 'decline', 'drop', 'downgrade', 'inflation',
  'crisis', 'disruption', 'volatility', 'loss', 'weak', 'fall', 'crash',
  'recession', 'default', 'sanction', 'conflict', 'tension', 'threat',
  'bankruptcy', 'layoff', 'closure', 'corruption', 'fraud', 'slowdown',
  'bearish', 'deteriorate', 'plunge', 'slump', 'deficit', 'debt', 'delay',
  'concern', 'warning', 'instability', 'downside', 'contraction', 'flee',
  'hedge', 'panic', 'collapse', 'underperform', 'miss', 'negative', 'cut',
]);

const INTENSIFIERS = new Set([
  'very', 'extremely', 'significantly', 'sharply', 'dramatically', 'massive',
  'major', 'unprecedented', 'critical', 'severe', 'huge', 'substantial',
]);

/**
 * Score a single text string.
 * @returns {number} Score from -1 (very bearish) to +1 (very bullish)
 */
export function scoreSentiment(text) {
  if (!text || typeof text !== 'string') return 0;

  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  let score = 0;
  let amplifier = 1;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];

    if (INTENSIFIERS.has(w)) {
      amplifier = 1.5;
      continue;
    }

    if (POSITIVE_WORDS.has(w)) {
      score += 1 * amplifier;
    } else if (NEGATIVE_WORDS.has(w)) {
      score -= 1 * amplifier;
    }

    amplifier = 1; // reset after use
  }

  // Normalize to [-1, 1] using tanh-like sigmoid
  const totalWords = Math.max(words.length, 1);
  const rawScore = score / Math.sqrt(totalWords);
  return Math.max(-1, Math.min(1, rawScore / 2));
}

/**
 * Score an array of news articles.
 * @param {Array<{headline: string, body?: string}>} articles
 * @returns {{ scores: number[], average: number, label: string }}
 */
export function scoreArticles(articles) {
  if (!articles?.length) return { scores: [], average: 0, label: 'Neutral' };

  const scores = articles.map(a => {
    const text = `${a.headline || ''} ${a.body || ''}`;
    return scoreSentiment(text);
  });

  const average = scores.reduce((s, v) => s + v, 0) / scores.length;
  const label = average > 0.15 ? 'Bullish' : average < -0.15 ? 'Bearish' : 'Neutral';

  return {
    scores,
    average: Math.round(average * 1000) / 1000,
    label,
  };
}
