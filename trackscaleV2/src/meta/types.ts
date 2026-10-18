export type Status = "ACTIVE" | "PAUSED";
export type Objective = "OUTCOME_SALES" | "OUTCOME_TRAFFIC" | "OUTCOME_AWARENESS" | "OUTCOME_ENGAGEMENT";

export const OBJECTIVE_LABEL: Record<Objective, string> = {
  OUTCOME_SALES: "Vendas",
  OUTCOME_TRAFFIC: "Tráfego",
  OUTCOME_AWARENESS: "Reconhecimento",
  OUTCOME_ENGAGEMENT: "Engajamento",
};

export interface Business { id: string; name: string }
export interface AdAccount { id: string; name: string; currency: string }
export interface Pixel { id: string; name: string }
export interface FbPage { id: string; name: string }
export interface Reel { id: string; name: string; date: string }

export type OptionType = "country" | "locale" | "interest" | "audience";
export interface TargetingOption { id: string; name: string; type: OptionType }

export type Gender = "all" | "men" | "women";

export interface Targeting {
  countries: TargetingOption[];
  languages: TargetingOption[];
  interests: TargetingOption[];
  includeAudiences: TargetingOption[];
  excludeAudiences: TargetingOption[];
  ageMin: number;
  ageMax: number;
  gender: Gender;
}

export const emptyTargeting = (): Targeting => ({
  countries: [],
  languages: [],
  interests: [],
  includeAudiences: [],
  excludeAudiences: [],
  ageMin: 18,
  ageMax: 44,
  gender: "all",
});

/** Métricas de um anúncio em um dia (o que a Meta + o tracking do smartlink devolvem). */
export interface DailyStat {
  date: string; // YYYY-MM-DD
  spend: number;
  impressions: number;
  reach: number;
  linkClicks: number;
  results: number; // resultado otimizado pela Meta
  plays3s: number;
  platformClicks: number; // cliques para Spotify/Apple Music… no smartlink
}

export interface Campaign {
  id: string;
  name: string;
  adAccountId: string;
  objective: Objective;
  status: Status;
  smartlinkId: string | null;
  /** false = existe na Meta mas não é acompanhada no TrackScale (aparece em "Importar"). */
  tracked: boolean;
  rcprTarget: number | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export interface AdSet {
  id: string;
  campaignId: string;
  name: string;
  status: Status;
  dailyBudget: number;
  targeting: Targeting;
  createdAt: string;
}

export interface Creative {
  kind: "video" | "post";
  source: "upload" | "ig_reel";
  label: string;
  primaryText: string;
}

export interface Ad {
  id: string;
  adsetId: string;
  campaignId: string;
  name: string;
  status: Status;
  creative: Creative;
  createdAt: string;
  history: DailyStat[];
  removedByAutomation: boolean;
}
