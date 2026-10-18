import type { Ad, AdSet, Campaign } from "../meta/types";
import type { Metrics } from "./metrics";

export type Schedule = "1h" | "6h" | "12h" | "24h" | "off";

export const SCHEDULE_LABEL: Record<Schedule, string> = {
  "1h": "A cada hora",
  "6h": "A cada 6 horas",
  "12h": "A cada 12 horas",
  "24h": "Uma vez por dia",
  off: "Desligado",
};

export const SCHEDULE_MS: Record<Schedule, number> = {
  "1h": 3600e3,
  "6h": 6 * 3600e3,
  "12h": 12 * 3600e3,
  "24h": 24 * 3600e3,
  off: 0,
};

export interface Rules {
  schedule: Schedule;
  /** Meta de RCPR usada quando a campanha não define a sua. */
  defaultRcpr: number;
  /** Só julga um anúncio depois de N impressões. */
  analyzeAfterImpressions: number;
  /** Tolerância acima da meta antes de desligar (0.3 = 30%). */
  threshold: number;
  maxFrequency: number;
  /** Nunca deixa um conjunto ativo sem anúncios. */
  preventCampaignDeath: boolean;
  minActiveAds: number;
  /** Desliga o conjunto quando não sobra anúncio viável. */
  analyzeAdsets: boolean;
  emailNotifications: boolean;
}

export const DEFAULT_RULES: Rules = {
  schedule: "1h",
  defaultRcpr: 1.5,
  analyzeAfterImpressions: 1000,
  threshold: 0.3,
  maxFrequency: 3,
  preventCampaignDeath: true,
  minActiveAds: 1,
  analyzeAdsets: true,
  emailNotifications: false,
};

export type Reason =
  | "off_frequency"
  | "off_expensive"
  | "kept_frequency_warning"
  | "kept_prevent_death"
  | "on_untested"
  | "on_min_active"
  | "adset_off";

export const REASON_LABEL: Record<Reason, string> = {
  off_frequency: "Desligado – limite de frequência atingido",
  off_expensive: "Desligado – RCPR acima da meta",
  kept_frequency_warning: "Mantido – alerta de frequência",
  kept_prevent_death: "Mantido – evita que o conjunto fique sem anúncios",
  on_untested: "Ligado – anúncio não testado recebe uma chance",
  on_min_active: "Ligado – mantém o mínimo de anúncios ativos",
  adset_off: "Conjunto desligado – nenhum anúncio viável",
};

export interface OptAction {
  level: "ad" | "adset";
  id: string;
  campaignId: string;
  adsetId: string;
  action: "on" | "off" | "kept";
  reason: Reason;
  rcpr: number | null;
  frequency: number | null;
  impressions: number;
}

export function isExpensive(m: Metrics, target: number, threshold: number): boolean {
  const limit = target * (1 + threshold);
  // sem nenhum clique nas plataformas, compara o gasto com o que uma conversão poderia custar
  return m.rcpr !== null ? m.rcpr > limit : m.spend > limit;
}

const byRcpr = (metricsOf: (ad: Ad) => Metrics) => (a: Ad, b: Ad) =>
  (metricsOf(a).rcpr ?? Infinity) - (metricsOf(b).rcpr ?? Infinity);

/** Uma rodada de otimização. Função pura: devolve as ações, quem chama aplica. */
export function optimize(
  campaigns: Campaign[],
  adsets: AdSet[],
  ads: Ad[],
  rules: Rules,
  metricsOf: (ad: Ad) => Metrics,
): OptAction[] {
  const out: OptAction[] = [];

  for (const c of campaigns) {
    if (!c.tracked || c.status !== "ACTIVE") continue;
    const target = c.rcprTarget ?? rules.defaultRcpr;

    for (const s of adsets) {
      if (s.campaignId !== c.id || s.status !== "ACTIVE") continue;
      const own = ads.filter((a) => a.adsetId === s.id);
      const push = (ad: Ad, action: OptAction["action"], reason: Reason) => {
        const m = metricsOf(ad);
        out.push({
          level: "ad", id: ad.id, campaignId: c.id, adsetId: s.id, action, reason,
          rcpr: m.rcpr, frequency: m.frequency, impressions: m.impressions,
        });
      };

      const active = own.filter((a) => a.status === "ACTIVE");
      const offs: { ad: Ad; reason: Reason }[] = [];
      for (const ad of active) {
        const m = metricsOf(ad);
        if (m.impressions < rules.analyzeAfterImpressions) continue;
        const freq = m.frequency ?? 0;
        if (freq >= rules.maxFrequency) offs.push({ ad, reason: "off_frequency" });
        else if (isExpensive(m, target, rules.threshold)) offs.push({ ad, reason: "off_expensive" });
        else if (freq >= rules.maxFrequency * 0.8) push(ad, "kept", "kept_frequency_warning");
      }

      const paused = own.filter((a) => a.status === "PAUSED");
      const untested = paused.filter((a) => metricsOf(a).impressions < rules.analyzeAfterImpressions);
      let activeCount = active.length - offs.length;

      // cada anúncio desligado abre vaga para um não testado
      const used = new Set<string>();
      for (const ad of untested.slice(0, offs.length)) {
        push(ad, "on", "on_untested");
        used.add(ad.id);
        activeCount++;
      }

      if (rules.preventCampaignDeath) {
        // primeiro desfaz desligamentos (o menos ruim fica), depois religa pausados
        offs.sort((a, b) => byRcpr(metricsOf)(a.ad, b.ad));
        while (activeCount < rules.minActiveAds && offs.length > 0) {
          push(offs.shift()!.ad, "kept", "kept_prevent_death");
          activeCount++;
        }
        const rest = paused.filter((a) => !used.has(a.id)).sort(byRcpr(metricsOf));
        for (const ad of rest) {
          if (activeCount >= rules.minActiveAds) break;
          push(ad, "on", "on_min_active");
          activeCount++;
        }
      }

      for (const o of offs) push(o.ad, "off", o.reason);

      if (rules.analyzeAdsets && activeCount === 0 && own.length > 0) {
        out.push({
          level: "adset", id: s.id, campaignId: c.id, adsetId: s.id, action: "off",
          reason: "adset_off", rcpr: null, frequency: null, impressions: 0,
        });
      }
    }
  }
  return out;
}
