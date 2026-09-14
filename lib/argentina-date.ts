export const ARGENTINA_TIMEZONE = "America/Argentina/Buenos_Aires";

export function dateOnly(value: string | Date | null | undefined) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function formatArgentinaDate(value: string | Date | null | undefined) {
  const date = dateOnly(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function argentinaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: ARGENTINA_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
