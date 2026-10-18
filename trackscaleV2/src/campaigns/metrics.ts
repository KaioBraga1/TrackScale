import type { DailyStat } from "../meta/types";
import { inRange, type Range } from "./dates";

export interface Totals {
  spend: number;
  impressions: number;
  reach: number;
  linkClicks: number;
  results: number;
  plays3s: number;
  platformClicks: number;
}

export interface Metrics extends Totals {
  /** Custo real por resultado: gasto ÷ cliques nas plataformas (Spotify, Apple Music…). */
  rcpr: number | null;
  /** Custo por resultado da Meta. */
  cpr: number | null;
  cpc: number | null;
  ctr: number | null;
  frequency: number | null;
  playRate: number | null;
  /** Conversão real: cliques nas plataformas ÷ cliques no link. */
  convRate: number | null;
}

export const ZERO: Totals = {
  spend: 0, impressions: 0, reach: 0, linkClicks: 0, results: 0, plays3s: 0, platformClicks: 0,
};

export function addTotals(a: Totals, b: Totals): Totals {
  return {
    spend: a.spend + b.spend,
    impressions: a.impressions + b.impressions,
    reach: a.reach + b.reach,
    linkClicks: a.linkClicks + b.linkClicks,
    results: a.results + b.results,
    plays3s: a.plays3s + b.plays3s,
    platformClicks: a.platformClicks + b.platformClicks,
  };
}

export function sumStats(stats: DailyStat[], range: Range, now: string): Totals {
  return stats.filter((s) => inRange(s.date, range, now)).reduce<Totals>(addTotals, ZERO);
}

const div = (a: number, b: number) => (b > 0 ? a / b : null);

export function derive(t: Totals): Metrics {
  return {
    ...t,
    rcpr: div(t.spend, t.platformClicks),
    cpr: div(t.spend, t.results),
    cpc: div(t.spend, t.linkClicks),
    ctr: div(t.linkClicks, t.impressions),
    frequency: div(t.impressions, t.reach),
    playRate: div(t.plays3s, t.impressions),
    convRate: div(t.platformClicks, t.linkClicks),
  };
}

export const CONV_BENCHMARK = 0.6;
