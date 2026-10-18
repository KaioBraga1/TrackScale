export type Range = "today" | "this_month" | "last_month" | "max";

export const RANGE_LABEL: Record<Range, string> = {
  today: "Hoje",
  this_month: "Este mês",
  last_month: "Mês passado",
  max: "Máx.",
};

export const toDate = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return toDate(d);
}

export const today = (offsetDays = 0) => addDays(toDate(new Date()), offsetDays);

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5);
}

export function inRange(date: string, range: Range, now: string): boolean {
  if (range === "max") return true;
  if (range === "today") return date === now;
  if (range === "this_month") return date.slice(0, 7) === now.slice(0, 7);
  const prev = addDays(`${now.slice(0, 7)}-01`, -1);
  return date.slice(0, 7) === prev.slice(0, 7);
}
