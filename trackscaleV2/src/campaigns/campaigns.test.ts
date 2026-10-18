import { describe, expect, it } from "vitest";
import { countryOption, INTERESTS } from "../meta/presets";
import { emptyTargeting, type Ad, type AdSet, type Campaign } from "../meta/types";
import { addDays, inRange } from "./dates";
import { derive, sumStats, ZERO, type Metrics } from "./metrics";
import { adsetName } from "./naming";
import { DEFAULT_RULES, optimize, type Rules } from "./optimizer";
import { jobPhases, planSteps, type LaunchInput } from "./plan";
import { simulateDay } from "./simulate";

const campaign: Campaign = {
  id: "c1", name: "C", adAccountId: "act", objective: "OUTCOME_SALES", status: "ACTIVE", smartlinkId: null,
  tracked: true, rcprTarget: 0.5, startDate: null, endDate: null, createdAt: "2026-10-01T00:00:00Z",
};
const adset: AdSet = { id: "s1", campaignId: "c1", name: "S", status: "ACTIVE", dailyBudget: 20, targeting: emptyTargeting(), createdAt: "" };
const ad = (id: string, status: Ad["status"] = "ACTIVE"): Ad => ({
  id, adsetId: "s1", campaignId: "c1", name: id, status,
  creative: { kind: "video", source: "upload", label: id, primaryText: "" }, createdAt: "", history: [], removedByAutomation: false,
});
const m = (p: Partial<Metrics>): Metrics => ({ ...derive(ZERO), ...p });
const rules: Rules = { ...DEFAULT_RULES, analyzeAfterImpressions: 1000, threshold: 0.3, maxFrequency: 3 };

describe("métricas", () => {
  it("RCPR = gasto ÷ cliques nas plataformas; sem denominador vira null", () => {
    const x = derive({ ...ZERO, spend: 10, platformClicks: 20, linkClicks: 40, impressions: 4000, reach: 2000 });
    expect(x.rcpr).toBe(0.5);
    expect(x.convRate).toBe(0.5);
    expect(x.frequency).toBe(2);
    expect(derive(ZERO).rcpr).toBeNull();
  });
  it("filtra por período", () => {
    const stats = [
      { date: "2026-09-30", spend: 1, impressions: 0, reach: 0, linkClicks: 0, results: 0, plays3s: 0, platformClicks: 0 },
      { date: "2026-10-14", spend: 2, impressions: 0, reach: 0, linkClicks: 0, results: 0, plays3s: 0, platformClicks: 0 },
    ];
    expect(sumStats(stats, "today", "2026-10-14").spend).toBe(2);
    expect(sumStats(stats, "last_month", "2026-10-14").spend).toBe(1);
    expect(sumStats(stats, "max", "2026-10-14").spend).toBe(3);
  });
  it("mês passado atravessa a virada do ano", () => {
    expect(inRange("2025-12-31", "last_month", "2026-01-05")).toBe(true);
  });
});

describe("otimizador", () => {
  it("desliga anúncio caro e dá chance a um não testado", () => {
    const ads = [ad("a"), ad("b"), ad("c", "PAUSED")];
    const metrics: Record<string, Metrics> = {
      a: m({ impressions: 5000, rcpr: 1.2, frequency: 1.5, spend: 12 }),
      b: m({ impressions: 5000, rcpr: 0.4, frequency: 1.5, spend: 8 }),
      c: m({ impressions: 0 }),
    };
    const out = optimize([campaign], [adset], ads, rules, (x) => metrics[x.id]);
    expect(out.map((o) => [o.id, o.action, o.reason])).toEqual([
      ["c", "on", "on_untested"],
      ["a", "off", "off_expensive"],
    ]);
  });

  it("desliga por frequência", () => {
    const out = optimize([campaign], [adset], [ad("a"), ad("b")], rules, (x) =>
      x.id === "a" ? m({ impressions: 5000, rcpr: 0.3, frequency: 3.4 }) : m({ impressions: 5000, rcpr: 0.3, frequency: 1 }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "a", action: "off", reason: "off_frequency" });
  });

  it("evitar morte: mantém o menos ruim quando todos são caros", () => {
    const out = optimize([campaign], [adset], [ad("a"), ad("b")], rules, (x) =>
      m({ impressions: 5000, rcpr: x.id === "a" ? 2 : 1, frequency: 1 }),
    );
    expect(out.find((o) => o.id === "b")).toMatchObject({ action: "kept", reason: "kept_prevent_death" });
    expect(out.find((o) => o.id === "a")).toMatchObject({ action: "off" });
  });

  it("sem evitar morte: desliga o conjunto quando não sobra anúncio", () => {
    const out = optimize([campaign], [adset], [ad("a")], { ...rules, preventCampaignDeath: false }, () =>
      m({ impressions: 5000, rcpr: 3, frequency: 1 }),
    );
    expect(out.map((o) => o.reason)).toEqual(["off_expensive", "adset_off"]);
  });

  it("ignora campanhas pausadas ou não acompanhadas", () => {
    const bad = () => m({ impressions: 5000, rcpr: 9, frequency: 9 });
    expect(optimize([{ ...campaign, status: "PAUSED" }], [adset], [ad("a")], rules, bad)).toEqual([]);
    expect(optimize([{ ...campaign, tracked: false }], [adset], [ad("a")], rules, bad)).toEqual([]);
  });
});

describe("plano do job", () => {
  const input: LaunchInput = {
    campaignName: "X", smartlinkId: "1", adAccountId: "act", objective: "OUTCOME_SALES",
    startDate: null, endDate: null, primaryText: "", activate: true,
    adsets: [{ key: "s1", dailyBudget: 10, targeting: emptyTargeting() }, { key: "s2", dailyBudget: 10, targeting: emptyTargeting() }],
    creatives: [{ key: "v1", source: "upload", label: "a.mp4" }, { key: "r1", source: "ig_reel", label: "reel" }],
  };
  it("um anúncio por (conjunto × criativo), upload só para vídeos enviados", () => {
    const phases = Object.fromEntries(jobPhases(planSteps(input)).map((p) => [p.label, p.total]));
    expect(phases).toEqual({
      "Enviar vídeos para a Meta": 1,
      "Criar campanha": 1,
      "Criar conjuntos de anúncios": 2,
      "Criar criativos": 2,
      "Criar anúncios": 4,
    });
  });
  it("campanha vem antes dos conjuntos, que vêm antes dos anúncios", () => {
    const kinds = planSteps(input).map((s) => s.kind);
    expect(kinds.indexOf("campaign")).toBeLessThan(kinds.indexOf("adset"));
    expect(kinds.lastIndexOf("adset")).toBeLessThan(kinds.indexOf("ad"));
  });
});

describe("nome do conjunto e simulação", () => {
  it("monta países | interesses | idade", () => {
    const t = { ...emptyTargeting(), countries: ["BR", "PT", "AO", "MZ"].map(countryOption), interests: INTERESTS.slice(0, 3), gender: "women" as const };
    expect(adsetName(t)).toBe(`BR,PT,AO +1 | ${INTERESTS[0].name}, ${INTERESTS[1].name} +1 | 18-44 M`);
    expect(adsetName(emptyTargeting())).toBe("— | Amplo | 18-44");
  });
  it("simulação é determinística e consistente", () => {
    const a = simulateDay("ad1", "2026-10-01", 20, 3);
    expect(simulateDay("ad1", "2026-10-01", 20, 3)).toEqual(a);
    expect(a.platformClicks).toBeLessThanOrEqual(a.linkClicks);
    expect(a.reach).toBeLessThanOrEqual(a.impressions);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
