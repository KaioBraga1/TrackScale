import { AUDIENCES, COUNTRIES, INTERESTS, LANGUAGES, countryOption } from "./presets";
import type {
  AdAccount,
  Business,
  FbPage,
  OptionType,
  Pixel,
  Reel,
  TargetingOption,
} from "./types";

/**
 * Operações de leitura que o app precisa da Meta. Os nomes espelham as
 * "actions" do song.so (list_business_managers, list_ad_accounts, list_pixels,
 * list_pages, resolve_page_ig, search_targeting, list_custom_audiences,
 * list_page_reels). A escrita (criar campanha/conjunto/anúncio, mudar status)
 * acontece no job de lançamento.
 *
 * Duas implementações:
 *  - `mockMeta` (padrão): dados locais, sem rede.
 *  - `httpMeta`: chama o servidor em `server/` que fala com a Graph API.
 */
export interface MetaProvider {
  listBusinessManagers(): Promise<Business[]>;
  listAdAccounts(businessId: string): Promise<AdAccount[]>;
  listPixels(adAccountId: string): Promise<Pixel[]>;
  listPages(): Promise<FbPage[]>;
  resolvePageIg(pageId: string): Promise<string | null>;
  searchTargeting(type: Exclude<OptionType, "audience">, q: string, limit?: number): Promise<TargetingOption[]>;
  listCustomAudiences(adAccountId: string): Promise<TargetingOption[]>;
  listPageReels(pageId: string): Promise<Reel[]>;
}

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

const search = (list: TargetingOption[], q: string, limit: number) => {
  const t = q.trim().toLowerCase();
  return list.filter((o) => o.name.toLowerCase().includes(t) || o.id.toLowerCase() === t).slice(0, limit);
};

const PAGES: (FbPage & { ig: string })[] = [
  { id: "pg_1", name: "Luna Reis", ig: "lunareis" },
  { id: "pg_2", name: "Caio Ventura", ig: "caioventura" },
];

export const mockMeta: MetaProvider = {
  async listBusinessManagers() {
    await wait();
    return [
      { id: "bm_1", name: "Minha Gravadora" },
      { id: "bm_2", name: "Selo Independente" },
    ];
  },
  async listAdAccounts(businessId) {
    await wait();
    return [
      { id: `act_${businessId}_1`, name: "Conta principal", currency: "BRL" },
      { id: `act_${businessId}_2`, name: "Conta de testes", currency: "BRL" },
    ];
  },
  async listPixels(adAccountId) {
    await wait();
    return [{ id: `px_${adAccountId}`, name: "Pixel TrackScale" }];
  },
  async listPages() {
    await wait();
    return PAGES.map(({ id, name }) => ({ id, name }));
  },
  async resolvePageIg(pageId) {
    await wait(700);
    return PAGES.find((p) => p.id === pageId)?.ig ?? null;
  },
  async searchTargeting(type, q, limit = 10) {
    await wait(150);
    if (type === "country") return search(COUNTRIES.map(([c]) => countryOption(c)), q, limit);
    if (type === "locale") return search(LANGUAGES, q, limit);
    return search(INTERESTS, q, limit);
  },
  async listCustomAudiences() {
    await wait();
    return AUDIENCES;
  },
  async listPageReels(pageId) {
    await wait(400);
    const who = PAGES.find((p) => p.id === pageId)?.name ?? "Artista";
    return [
      "Trecho do refrão", "Bastidores do clipe", "Ao vivo no estúdio",
      "Dueto com fãs", "Teaser do lançamento", "Letra na tela",
    ].map((t, i) => ({
      id: `reel_${pageId}_${i + 1}`,
      name: `${who} – ${t}`,
      date: new Date(Date.now() - (i + 1) * 3 * 864e5).toISOString().slice(0, 10),
    }));
  },
};

/** Chama o servidor proxy (`server/index.mjs`), que guarda o token da Meta. */
export function httpMeta(baseUrl = "/api/meta"): MetaProvider {
  const call = async <T,>(action: string, params: Record<string, unknown> = {}): Promise<T> => {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...params }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
    return json.data as T;
  };
  return {
    listBusinessManagers: () => call("list_business_managers"),
    listAdAccounts: (business_id) => call("list_ad_accounts", { business_id }),
    listPixels: (ad_account_id) => call("list_pixels", { ad_account_id }),
    listPages: () => call("list_pages"),
    resolvePageIg: (page_id) => call("resolve_page_ig", { page_id }),
    searchTargeting: (type, q, limit = 10) => call("search_targeting", { type, q, limit }),
    listCustomAudiences: (ad_account_id) => call("list_custom_audiences", { ad_account_id }),
    listPageReels: (page_id) => call("list_page_reels", { page_id }),
  };
}

export const meta: MetaProvider =
  import.meta.env.VITE_META_MODE === "http" ? httpMeta() : mockMeta;
