import { addDays } from "../campaigns/dates";
import { adsetName } from "../campaigns/naming";
import { countryOption, INTERESTS } from "./presets";
import { emptyTargeting, type Ad, type AdSet, type Campaign, type Objective, type Status } from "./types";

/**
 * Campanhas que "já existem na Meta" quando a conta é conectada.
 * Entram como não acompanhadas (tracked=false) e aparecem em "Importar".
 */
export function buildRemoteSeed(adAccountId: string, now: string) {
  const campaigns: Campaign[] = [];
  const adsets: AdSet[] = [];
  const ads: Ad[] = [];

  const defs: { name: string; objective: Objective; status: Status; age: number; countries: string[]; interests: number[]; ads: number }[] = [
    { name: "Noite Azul – Teste BR", objective: "OUTCOME_SALES", status: "ACTIVE", age: 21, countries: ["BR"], interests: [0, 1], ads: 4 },
    { name: "Maré Alta – Lusófonos", objective: "OUTCOME_TRAFFIC", status: "ACTIVE", age: 12, countries: ["BR", "PT"], interests: [17, 19], ads: 3 },
    { name: "Reconhecimento Q3", objective: "OUTCOME_AWARENESS", status: "PAUSED", age: 40, countries: ["BR"], interests: [], ads: 2 },
    { name: "Engajamento Reels", objective: "OUTCOME_ENGAGEMENT", status: "PAUSED", age: 60, countries: ["US", "GB"], interests: [7], ads: 2 },
  ];

  defs.forEach((d, ci) => {
    const created = `${addDays(now, -d.age)}T12:00:00.000Z`;
    const cid = `${adAccountId}_rc${ci + 1}`;
    campaigns.push({
      id: cid, name: d.name, adAccountId, objective: d.objective, status: d.status,
      smartlinkId: null, tracked: false, rcprTarget: null, startDate: null, endDate: null, createdAt: created,
    });
    const targeting = {
      ...emptyTargeting(),
      countries: d.countries.map(countryOption),
      interests: d.interests.map((i) => INTERESTS[i]),
    };
    const sid = `${cid}_as1`;
    adsets.push({ id: sid, campaignId: cid, name: adsetName(targeting), status: "ACTIVE", dailyBudget: 30, targeting, createdAt: created });
    for (let i = 0; i < d.ads; i++) {
      ads.push({
        id: `${sid}_ad${i + 1}`, adsetId: sid, campaignId: cid, name: `${i + 1}`,
        status: i < 2 ? "ACTIVE" : "PAUSED",
        creative: { kind: "video", source: "upload", label: `video_${i + 1}.mp4`, primaryText: "" },
        createdAt: created, history: [], removedByAutomation: false,
      });
    }
  });

  return { campaigns, adsets, ads };
}
