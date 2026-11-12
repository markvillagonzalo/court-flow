const activityLabels: Record<string, string> = {
  player_joined: 'joined the line',
  player_left: 'left the line',
  leave_after_match: 'will leave after this game',
  players_called: 'Next group called',
  match_completed: '',
  player_skipped: 'was skipped',
  queue_reordered: '',
  session_created: 'opened',
  court_added: 'added',
  court_removed: 'A court was removed',
};

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'P';
}

export function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'now'
    : new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function formatSince(value: string) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  return elapsedMinutes < 1 ? 'just joined' : `${elapsedMinutes}m waiting`;
}

export function activityTitle(eventType: string, target: string) {
  const label = activityLabels[eventType];
  if (label === undefined) return target;
  if (eventType === 'players_called') return `${label}: ${target}`;
  if (eventType === 'court_removed') return label;
  return label ? `${target} ${label}` : target;
}
