import type { Objective, Targeting } from "../meta/types";

export interface WizardAdSet {
  key: string;
  dailyBudget: number;
  targeting: Targeting;
}

export interface WizardCreative {
  key: string;
  source: "upload" | "ig_reel";
  label: string;
  sizeMb?: number;
}

export interface LaunchInput {
  campaignName: string;
  smartlinkId: string;
  adAccountId: string;
  objective: Objective;
  startDate: string | null;
  endDate: string | null;
  primaryText: string;
  activate: boolean;
  adsets: WizardAdSet[];
  creatives: WizardCreative[];
}

export type StepKind = "upload" | "campaign" | "adset" | "creative" | "ad";

export interface JobStep {
  key: string;
  kind: StepKind;
  label: string;
  status: "pending" | "done";
  adsetKey?: string;
  creativeKey?: string;
}

/**
 * Mesmo desenho do job do song.so: uploads → campanha → conjuntos → criativos →
 * um anúncio para cada (conjunto × criativo).
 */
export function planSteps(input: LaunchInput): JobStep[] {
  const steps: JobStep[] = [];
  for (const c of input.creatives) {
    if (c.source === "upload") {
      steps.push({ key: `upload:${c.key}`, kind: "upload", label: `Enviar ${c.label}`, status: "pending", creativeKey: c.key });
    }
  }
  steps.push({ key: "campaign", kind: "campaign", label: `Criar campanha "${input.campaignName}"`, status: "pending" });
  input.adsets.forEach((s, i) =>
    steps.push({ key: `adset:${s.key}`, kind: "adset", label: `Criar conjunto ${i + 1}`, status: "pending", adsetKey: s.key }),
  );
  input.creatives.forEach((c, i) =>
    steps.push({ key: `creative:${c.key}`, kind: "creative", label: `Criar criativo ${i + 1}`, status: "pending", creativeKey: c.key }),
  );
  input.adsets.forEach((s, ai) =>
    input.creatives.forEach((c, ci) =>
      steps.push({
        key: `ad:${s.key}:${c.key}`,
        kind: "ad",
        label: `Anúncio ${ci + 1} no conjunto ${ai + 1}`,
        status: "pending",
        adsetKey: s.key,
        creativeKey: c.key,
      }),
    ),
  );
  return steps;
}

const PHASES: { kind: StepKind; label: string }[] = [
  { kind: "upload", label: "Enviar vídeos para a Meta" },
  { kind: "campaign", label: "Criar campanha" },
  { kind: "adset", label: "Criar conjuntos de anúncios" },
  { kind: "creative", label: "Criar criativos" },
  { kind: "ad", label: "Criar anúncios" },
];

export function jobPhases(steps: JobStep[]) {
  return PHASES.map((p) => {
    const of = steps.filter((s) => s.kind === p.kind);
    return { label: p.label, value: of.filter((s) => s.status === "done").length, total: of.length };
  }).filter((p) => p.total > 0);
}
