import { between, rng } from "../meta/rng";
import type { DailyStat } from "../meta/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Gera as métricas de um dia de um anúncio. Determinístico por (adId, data):
 * cada anúncio tem uma "qualidade" fixa, então uns performam melhor que outros
 * de forma consistente, o que dá ao otimizador algo real para decidir.
 * A frequência cresce com a idade do anúncio (fadiga).
 */
export function simulateDay(adId: string, date: string, budget: number, dayIndex: number): DailyStat {
  const quality = between(rng(adId), 0.4, 1.6);
  const r = rng(`${adId}:${date}`);
  const spend = round2(budget * between(r, 0.85, 1.05));
  const impressions = Math.round((spend / between(r, 4, 11)) * 1000);
  const reach = Math.round(impressions / (1.15 + dayIndex * 0.12 * between(r, 0.8, 1.2)));
  const linkClicks = Math.round(impressions * 0.012 * quality * between(r, 0.8, 1.2));
  const results = Math.round(linkClicks * between(r, 0.7, 0.9));
  const conv = Math.min(0.85, 0.5 * quality * between(r, 0.8, 1.2));
  const platformClicks = Math.round(linkClicks * conv);
  const plays3s = Math.round(impressions * between(r, 0.2, 0.45));
  return { date, spend, impressions, reach, linkClicks, results, plays3s, platformClicks };
}
