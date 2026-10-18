import type { Point } from "../components/MiniChart";
import type { Ad } from "../meta/types";
import { addDays, inRange, type Range } from "./dates";
import type { Totals } from "./metrics";

/** Série diária somando os anúncios dados; dias sem gasto entram como zero. */
export function dailySeries(ads: Ad[], key: keyof Totals, range: Range, now: string): Point[] {
  const byDay = new Map<string, number>();
  for (const ad of ads) {
    for (const s of ad.history) {
      if (!inRange(s.date, range, now)) continue;
      byDay.set(s.date, (byDay.get(s.date) ?? 0) + s[key]);
    }
  }
  if (byDay.size === 0) return [];
  const dates = [...byDay.keys()].sort();
  const out: Point[] = [];
  for (let d = dates[0]; d <= dates[dates.length - 1]; d = addDays(d, 1)) {
    out.push({ date: d, value: byDay.get(d) ?? 0 });
  }
  return out;
}
