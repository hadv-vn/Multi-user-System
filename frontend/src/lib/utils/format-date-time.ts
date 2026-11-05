const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

/** Định dạng chuỗi ISO 8601 theo giờ địa phương; `null` → `fallback`. */
export function formatDateTime(isoString: string | null, fallback = '—'): string {
  if (isoString === null) {
    return fallback;
  }
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? fallback : DATE_TIME_FORMATTER.format(date);
}
