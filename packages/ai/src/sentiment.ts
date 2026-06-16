export type SentimentLabel = 'negative' | 'neutral' | 'positive'
export type Sentiment = { score: number; label: SentimentLabel }

// A small, deterministic opinion lexicon. Deliberately feedback-flavoured (bugs/UX language)
// so it does something useful with no AI provider. AI refines this when one is configured.
const POSITIVE = new Set([
  'love',
  'loved',
  'great',
  'awesome',
  'amazing',
  'perfect',
  'excellent',
  'fantastic',
  'helpful',
  'thanks',
  'thank',
  'nice',
  'good',
  'easy',
  'fast',
  'smooth',
  'works',
  'useful',
  'brilliant',
  'wonderful',
  'delight',
  'delightful',
  'intuitive',
  'beautiful',
  'happy',
  'glad',
  'appreciate',
])
const NEGATIVE = new Set([
  'hate',
  'broken',
  'breaks',
  'crash',
  'crashes',
  'crashing',
  'bug',
  'buggy',
  'error',
  'errors',
  'slow',
  'laggy',
  'confusing',
  'confused',
  'terrible',
  'awful',
  'useless',
  'frustrating',
  'frustrated',
  'annoying',
  'annoyed',
  'fail',
  'fails',
  'failing',
  'broken',
  'missing',
  'wrong',
  'lost',
  'disappointed',
  'disappointing',
  'unusable',
  'horrible',
  'worst',
  'bad',
  'stuck',
  'impossible',
  'hard',
  'difficult',
  'cant',
  'wont',
  'doesnt',
  'never',
])
const NEGATORS = new Set(['not', 'no', "don't", 'dont', "doesn't", 'cant', "can't", 'never'])

/**
 * Deterministic lexicon sentiment in [-1, 1] with a 3-way label. Never throws, no network —
 * so every post gets a sentiment even when the AI provider is `none`.
 */
export function analyzeSentiment(text: string): Sentiment {
  const words = (text ?? '').toLowerCase().match(/[a-z']+/g) ?? []
  let score = 0
  for (let i = 0; i < words.length; i++) {
    const w = words[i] as string
    const negated = i > 0 && NEGATORS.has(words[i - 1] as string)
    if (POSITIVE.has(w)) score += negated ? -1 : 1
    else if (NEGATIVE.has(w)) score += negated ? 1 : -1
  }
  // Squash the raw count into [-1, 1] so longer rants don't run off the scale.
  const norm = score === 0 ? 0 : Math.tanh(score / 3)
  const rounded = Math.round(norm * 100) / 100
  return { score: rounded, label: labelFor(rounded) }
}

export function labelFor(score: number): SentimentLabel {
  if (score >= 0.2) return 'positive'
  if (score <= -0.2) return 'negative'
  return 'neutral'
}
