// Date helpers shared by Dashboard, Applications and Analytics.

// Turns "2026-10-14" or "2026-10-14T00:00:00.000Z" into a local-time date,
// so the calendar day never shifts because of the user's timezone.
export const parseLocalDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));

  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  return new Date(value);
};

// Like parseLocalDate, but returns null for empty or invalid input.
export function getDeadlineDate(value) {
  if (!value) return null;

  const date = parseLocalDate(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getDayStart(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Weekly goals count newly created applications, not status updates.
export function getCreatedDate(application) {
  if (!application.createdAt) return null;

  const date = new Date(application.createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Monday of the week containing `date`, at 00:00 local time.
export function getWeekStart(date) {
  const start = getDayStart(date);
  const daysSinceMonday = (start.getDay() + 6) % 7;

  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}
