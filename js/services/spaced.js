// Intervals in milliseconds
const INTERVALS = [
  1 * 86400000,   // 1 day
  3 * 86400000,   // 3 days
  7 * 86400000,   // 7 days
  14 * 86400000,  // 14 days
  30 * 86400000,  // 30 days
  60 * 86400000   // 60 days
];

export function getNextReview(cardProgress, correct) {
  const level = cardProgress?.level || 0;
  const newLevel = correct
    ? Math.min(level + 1, INTERVALS.length - 1)
    : 0;
  return {
    level: newLevel,
    next: Date.now() + INTERVALS[newLevel]
  };
}

export function sortBySpacedRepetition(cards, getProgress) {
  const now = Date.now();
  const due = [];
  const fresh = [];
  const notDue = [];

  for (const card of cards) {
    const p = getProgress(card);
    if (!p || p.next == null) fresh.push(card);
    else if (p.next <= now) due.push({ card, overdue: now - p.next });
    else notDue.push({ card, next: p.next });
  }

  due.sort((a, b) => b.overdue - a.overdue);
  notDue.sort((a, b) => a.next - b.next);

  return [...due.map(d => d.card), ...fresh, ...notDue.map(d => d.card)];
}
