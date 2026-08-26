const DAILY_QUOTES = [
  'Small steps every day add up to big results.',
  "You don't have to be perfect, you just have to show up.",
  'Progress, not perfection.',
  'Every page you read is a page closer to done.',
  'Your future self is cheering you on right now.',
  'Rest is part of studying, not a break from it.',
  'You are capable of more than you think.',
  "One task at a time — that's all this needs.",
  'Consistency beats intensity.',
  'Today is a fresh page. Write something good on it.',
  "It's okay to go slow, as long as you don't stop.",
  'You showed up today. That already counts.',
  'Hard days build the habits that make easy days possible.',
  'Believe in the slow work of getting better.',
  'You are not behind. You are exactly where you need to be.',
  'A little progress each day adds up to big results.',
  'Your effort today is an investment in tomorrow.',
  "Don't compare your chapter one to someone else's chapter twenty.",
  'Breathe. You have already survived every hard day so far.',
  'Studying is hard because it matters. Keep going.',
] as const;

/** Same quote all day, changes daily — stable across reloads, not random every visit. */
export function getDailyQuote(date = new Date()): string {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86_400_000);

  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

/** Stable per-day key for tracking whether today's popup has already been shown/dismissed. */
export function getDailyQuoteKey(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
