import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { uid } from "../lib/store";
import { buildRemoteSeed } from "../meta/seed";
import type { Ad, AdSet, Business, Campaign, Status } from "../meta/types";
import { addDays, daysBetween, today } from "./dates";
import { derive, sumStats } from "./metrics";
import { adsetName } from "./naming";
import { DEFAULT_RULES, optimize, SCHEDULE_MS, type Reason, type Rules } from "./optimizer";
import { planSteps, type JobStep, type LaunchInput } from "./plan";
import { simulateDay } from "./simulate";

export interface Connection {
  connected: boolean;
  business: Business | null;
  adAccountId: string | null;
  adAccountName: string | null;
  pixelId: string | null;
  pageId: string | null;
  pageName: string | null;
  igUsername: string | null;
}

export interface Job {
  id: string;
  status: "running" | "paused" | "done" | "cancelled";
  createdAt: string;
  input: LaunchInput;
  steps: JobStep[];
  results: Record<string, string>;
}

export interface LogEntry {
  id: string;
  at: string;
  trigger: "manual" | "schedule";
  campaignId: string;
  adsetId: string;
  adId: string | null;
  action: "on" | "off" | "kept";
  reason: Reason;
  rcpr: number | null;
  frequency: number | null;
  impressions: number;
}

export interface AdsState {
  connection: Connection;
  campaigns: Campaign[];
  adsets: AdSet[];
  ads: Ad[];
  jobs: Job[];
  rules: Rules;
  log: LogEntry[];
  lastOptimizationAt: string | null;
  /** Último dia já simulado. */
  simulatedThrough: string | null;
  /** Dias adiantados pelo botão "Simular +1 dia". */
  clockOffset: number;
}

export type Level = "campaign" | "adset" | "ad";

type Action =
  | { type: "connect"; connection: Connection }
  | { type: "disconnect" }
  | { type: "advanceDay" }
  | { type: "startJob"; input: LaunchInput }
  | { type: "runJobStep"; jobId: string }
  | { type: "setJobStatus"; jobId: string; status: Job["status"] }
  | { type: "dismissJob"; jobId: string }
  | { type: "setStatus"; level: Level; id: string; status: Status }
  | { type: "setRcprTarget"; campaignId: string; value: number | null }
  | { type: "importCampaign"; campaignId: string; smartlinkId: string | null }
  | { type: "linkSmartlink"; campaignId: string; smartlinkId: string | null }
  | { type: "untrackCampaign"; campaignId: string }
  | { type: "deleteCampaign"; campaignId: string }
  | { type: "runOptimization"; trigger: LogEntry["trigger"] }
  | { type: "setRules"; rules: Rules };

const KEY = "trackscale:ads:v1";

const EMPTY_CONNECTION: Connection = {
  connected: false, business: null, adAccountId: null, adAccountName: null,
  pixelId: null, pageId: null, pageName: null, igUsername: null,
};

const initial = (): AdsState => ({
  connection: EMPTY_CONNECTION,
  campaigns: [], adsets: [], ads: [], jobs: [],
  rules: DEFAULT_RULES, log: [],
  lastOptimizationAt: null, simulatedThrough: null, clockOffset: 0,
});

export const nowDate = (s: AdsState) => today(s.clockOffset);
const nowIso = (s: AdsState) => new Date(Date.now() + s.clockOffset * 864e5).toISOString();

/** Gera os dias (from, to] para os anúncios que estavam rodando. */
function advance(s: AdsState, from: string, to: string, only?: Set<string>): Ad[] {
  const camps = new Map(s.campaigns.map((c) => [c.id, c]));
  const sets = new Map(s.adsets.map((a) => [a.id, a]));
  const ads = s.ads.map((a) => (only && !only.has(a.id) ? a : { ...a, history: [...a.history] }));

  for (let d = addDays(from, 1); d <= to; d = addDays(d, 1)) {
    const live = ads.filter((a) => {
      if (only && !only.has(a.id)) return false;
      const set = sets.get(a.adsetId);
      const c = camps.get(a.campaignId);
      return (
        a.status === "ACTIVE" && set?.status === "ACTIVE" && c?.status === "ACTIVE" &&
        a.createdAt.slice(0, 10) <= d &&
        (!c.startDate || c.startDate <= d) && (!c.endDate || d <= c.endDate)
      );
    });
    const perSet = new Map<string, number>();
    live.forEach((a) => perSet.set(a.adsetId, (perSet.get(a.adsetId) ?? 0) + 1));
    for (const a of live) {
      const budget = sets.get(a.adsetId)!.dailyBudget / perSet.get(a.adsetId)!;
      a.history.push(simulateDay(a.id, d, budget, daysBetween(a.createdAt.slice(0, 10), d)));
    }
  }
  return ads;
}

function catchUp(s: AdsState): AdsState {
  const now = nowDate(s);
  if (!s.simulatedThrough) return { ...s, simulatedThrough: now };
  if (s.simulatedThrough >= now) return s;
  return { ...s, ads: advance(s, s.simulatedThrough, now), simulatedThrough: now };
}

const lifetime = (ad: Ad, now: string) => derive(sumStats(ad.history, "max", now));

function runOptimization(s: AdsState, trigger: LogEntry["trigger"]): AdsState {
  const now = nowDate(s);
  const actions = optimize(s.campaigns, s.adsets, s.ads, s.rules, (ad) => lifetime(ad, now));
  const at = nowIso(s);

  const adChanges = new Map(actions.filter((a) => a.level === "ad" && a.action !== "kept").map((a) => [a.id, a.action]));
  const setOffs = new Set(actions.filter((a) => a.level === "adset").map((a) => a.id));

  const entries: LogEntry[] = actions.map((a) => ({
    id: uid(), at, trigger, campaignId: a.campaignId, adsetId: a.adsetId,
    adId: a.level === "ad" ? a.id : null, action: a.action, reason: a.reason,
    rcpr: a.rcpr, frequency: a.frequency, impressions: a.impressions,
  }));

  return {
    ...s,
    ads: s.ads.map((ad) => {
      const ch = adChanges.get(ad.id);
      if (!ch) return ad;
      return { ...ad, status: ch === "on" ? "ACTIVE" : "PAUSED", removedByAutomation: ch === "off" };
    }),
    adsets: s.adsets.map((a) => (setOffs.has(a.id) ? { ...a, status: "PAUSED" } : a)),
    log: [...entries, ...s.log].slice(0, 200),
    lastOptimizationAt: new Date().toISOString(),
  };
}

function runJobStep(s: AdsState, jobId: string): AdsState {
  const job = s.jobs.find((j) => j.id === jobId);
  if (!job || job.status !== "running") return s;
  const idx = job.steps.findIndex((st) => st.status === "pending");
  if (idx < 0) return updateJob(s, { ...job, status: "done" });

  const step = job.steps[idx];
  const input = job.input;
  const results = { ...job.results };
  const createdAt = nowIso(s);
  let next = s;

  switch (step.kind) {
    case "upload":
    case "creative":
      results[step.key] = `${step.kind}_${uid()}`;
      break;
    case "campaign": {
      const id = `cmp_${uid()}`;
      results.campaign = id;
      next = {
        ...next,
        campaigns: [
          {
            id, name: input.campaignName, adAccountId: input.adAccountId, objective: input.objective,
            status: input.activate ? "ACTIVE" : "PAUSED", smartlinkId: input.smartlinkId, tracked: true,
            rcprTarget: null, startDate: input.startDate, endDate: input.endDate, createdAt,
          },
          ...next.campaigns,
        ],
      };
      break;
    }
    case "adset": {
      const w = input.adsets.find((x) => x.key === step.adsetKey)!;
      const id = `as_${uid()}`;
      results[step.key] = id;
      next = {
        ...next,
        adsets: [...next.adsets, {
          id, campaignId: results.campaign, name: adsetName(w.targeting), status: "ACTIVE",
          dailyBudget: w.dailyBudget, targeting: w.targeting, createdAt,
        }],
      };
      break;
    }
    case "ad": {
      const c = input.creatives.find((x) => x.key === step.creativeKey)!;
      const adsetId = results[`adset:${step.adsetKey}`];
      const n = next.ads.filter((x) => x.adsetId === adsetId).length + 1;
      next = {
        ...next,
        ads: [...next.ads, {
          id: `ad_${uid()}`, adsetId, campaignId: results.campaign, name: `${n}`, status: "ACTIVE",
          creative: { kind: c.source === "upload" ? "video" : "post", source: c.source, label: c.label, primaryText: input.primaryText },
          createdAt, history: [], removedByAutomation: false,
        }],
      };
      break;
    }
  }

  const steps = job.steps.map((st, i) => (i === idx ? { ...st, status: "done" as const } : st));
  const done = steps.every((st) => st.status === "done");
  return updateJob(next, { ...job, steps, results, status: done ? "done" : "running" });
}

const updateJob = (s: AdsState, job: Job): AdsState => ({
  ...s,
  jobs: s.jobs.map((j) => (j.id === job.id ? job : j)),
});

const mapById = <T extends { id: string }>(list: T[], id: string, fn: (x: T) => T) =>
  list.map((x) => (x.id === id ? fn(x) : x));

function reducer(prev: AdsState, a: Action): AdsState {
  const s = catchUp(prev);
  switch (a.type) {
    case "connect": {
      const seed = buildRemoteSeed(a.connection.adAccountId!, nowDate(s));
      const known = new Set(s.campaigns.map((c) => c.id));
      const campaigns = seed.campaigns.filter((c) => !known.has(c.id));
      const ids = new Set(campaigns.map((c) => c.id));
      const adsets = seed.adsets.filter((x) => ids.has(x.campaignId));
      const ads = seed.ads.filter((x) => ids.has(x.campaignId));
      const merged: AdsState = {
        ...s,
        connection: a.connection,
        campaigns: [...s.campaigns, ...campaigns],
        adsets: [...s.adsets, ...adsets],
        ads: [...s.ads, ...ads],
      };
      // histórico retroativo das campanhas que já rodavam na Meta
      const earliest = campaigns.reduce((m, c) => (c.createdAt < m ? c.createdAt : m), nowIso(s)).slice(0, 10);
      return { ...merged, ads: advance(merged, addDays(earliest, -1), merged.simulatedThrough!, new Set(ads.map((x) => x.id))) };
    }
    case "disconnect":
      return { ...s, connection: EMPTY_CONNECTION };
    case "advanceDay": {
      const moved = catchUp({ ...s, clockOffset: s.clockOffset + 1 });
      return moved.rules.schedule === "off" ? moved : runOptimization(moved, "schedule");
    }
    case "startJob":
      return {
        ...s,
        jobs: [{ id: uid(), status: "running", createdAt: nowIso(s), input: a.input, steps: planSteps(a.input), results: {} }, ...s.jobs],
      };
    case "runJobStep":
      return runJobStep(s, a.jobId);
    case "setJobStatus":
      return { ...s, jobs: mapById(s.jobs, a.jobId, (j) => ({ ...j, status: a.status })) };
    case "dismissJob":
      return { ...s, jobs: s.jobs.filter((j) => j.id !== a.jobId) };
    case "setStatus":
      if (a.level === "campaign") return { ...s, campaigns: mapById(s.campaigns, a.id, (c) => ({ ...c, status: a.status })) };
      if (a.level === "adset") return { ...s, adsets: mapById(s.adsets, a.id, (x) => ({ ...x, status: a.status })) };
      return { ...s, ads: mapById(s.ads, a.id, (x) => ({ ...x, status: a.status, removedByAutomation: false })) };
    case "setRcprTarget":
      return { ...s, campaigns: mapById(s.campaigns, a.campaignId, (c) => ({ ...c, rcprTarget: a.value })) };
    case "importCampaign":
      return { ...s, campaigns: mapById(s.campaigns, a.campaignId, (c) => ({ ...c, tracked: true, smartlinkId: a.smartlinkId })) };
    case "linkSmartlink":
      return { ...s, campaigns: mapById(s.campaigns, a.campaignId, (c) => ({ ...c, smartlinkId: a.smartlinkId })) };
    case "untrackCampaign":
      return { ...s, campaigns: mapById(s.campaigns, a.campaignId, (c) => ({ ...c, tracked: false })) };
    case "deleteCampaign":
      return {
        ...s,
        campaigns: s.campaigns.filter((c) => c.id !== a.campaignId),
        adsets: s.adsets.filter((x) => x.campaignId !== a.campaignId),
        ads: s.ads.filter((x) => x.campaignId !== a.campaignId),
      };
    case "runOptimization":
      return runOptimization(s, a.trigger);
    case "setRules":
      return { ...s, rules: a.rules };
  }
}

function load(): AdsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return catchUp({ ...initial(), ...(JSON.parse(raw) as AdsState) });
  } catch {
    /* storage indisponível ou corrompido */
  }
  return catchUp(initial());
}

interface AdsValue {
  state: AdsState;
  now: string;
  dispatch: (a: Action) => void;
}

const Ctx = createContext<AdsValue | null>(null);

export function AdsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignora */
    }
  }, [state]);

  // Job de lançamento: um passo por vez. Sobrevive a reload (retoma sozinho).
  const runningJob = state.jobs.find((j) => j.status === "running");
  useEffect(() => {
    if (!runningJob) return;
    const t = setTimeout(() => dispatch({ type: "runJobStep", jobId: runningJob.id }), 450);
    return () => clearTimeout(t);
  }, [runningJob]);

  // Automação agendada (no song.so roda no servidor; aqui roda com o app aberto).
  const period = SCHEDULE_MS[state.rules.schedule];
  useEffect(() => {
    if (!period || !state.connection.connected) return;
    const check = () => {
      const last = state.lastOptimizationAt ? Date.parse(state.lastOptimizationAt) : 0;
      if (Date.now() - last >= period) dispatch({ type: "runOptimization", trigger: "schedule" });
    };
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, [period, state.lastOptimizationAt, state.connection.connected]);

  const value = useMemo(() => ({ state, now: nowDate(state), dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAds() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAds fora do AdsProvider");
  return v;
}
