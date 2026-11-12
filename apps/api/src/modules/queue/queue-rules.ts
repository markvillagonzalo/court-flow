export type WaitingEntry = { id: string; queueOrder: number };

export function orderWaiting<T extends WaitingEntry>(tickets: T[]): T[] {
  return [...tickets].sort(
    (left, right) => left.queueOrder - right.queueOrder || left.id.localeCompare(right.id),
  );
}

export function takeNext<T extends WaitingEntry>(tickets: T[], count: number): T[] {
  if (!Number.isInteger(count) || count < 1) throw new RangeError('count must be positive');
  return orderWaiting(tickets).slice(0, count);
}

export function normalizeReason(reason: string): string {
  const clean = reason.trim().replace(/\s+/g, ' ');
  if (clean.length < 3) throw new RangeError('Please provide a reason (at least 3 characters)');
  if (clean.length > 240) throw new RangeError('Reason must be 240 characters or fewer');
  return clean;
}
