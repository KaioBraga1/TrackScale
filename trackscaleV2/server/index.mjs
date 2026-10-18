// Proxy da Meta Marketing API (Graph API). Mesmo papel das Edge Functions
// "meta-ads-*" do song.so: o navegador manda { action, ...params } e o
// servidor chama a Graph API com o token, que nunca vai para o front.
//
//   META_ACCESS_TOKEN=... node server/index.mjs
//
// Variáveis: META_ACCESS_TOKEN (obrigatória), META_API_VERSION (padrão v23.0), PORT (padrão 8787).

import { createServer } from "node:http";

const TOKEN = process.env.META_ACCESS_TOKEN;
const VERSION = process.env.META_API_VERSION ?? "v23.0";
const PORT = Number(process.env.PORT ?? 8787);
const GRAPH = `https://graph.facebook.com/${VERSION}`;

if (!TOKEN) {
  console.error("Defina META_ACCESS_TOKEN (token de System User com ads_management, ads_read, business_management, pages_read_engagement, instagram_basic).");
  process.exit(1);
}

async function graph(method, path, params = {}) {
  const url = new URL(`${GRAPH}/${path}`);
  const body = new URLSearchParams();
  const target = method === "GET" ? url.searchParams : body;
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) target.set(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  target.set("access_token", TOKEN);
  const res = await fetch(url, method === "GET" ? undefined : { method, body });
  const json = await res.json();
  if (!res.ok || json.error) {
    const err = new Error(json.error?.error_user_msg ?? json.error?.message ?? `Graph HTTP ${res.status}`);
    err.status = res.status === 200 ? 400 : res.status;
    throw err;
  }
  return json;
}

const act = (id) => (String(id).startsWith("act_") ? id : `act_${id}`);
const pick = (rows) => (rows.data ?? []).map((r) => ({ id: r.id, name: r.name }));
const TARGETING_TYPE = { interest: "adinterest", country: "adgeolocation", locale: "adlocale" };

const actions = {
  // ---------- leitura ----------
  list_business_managers: async () => pick(await graph("GET", "me/businesses", { fields: "id,name" })),

  list_ad_accounts: async ({ business_id }) => {
    const fields = "id,name,currency";
    const [owned, client] = await Promise.all([
      graph("GET", `${business_id}/owned_ad_accounts`, { fields }),
      graph("GET", `${business_id}/client_ad_accounts`, { fields }).catch(() => ({ data: [] })),
    ]);
    return [...owned.data, ...client.data].map((a) => ({ id: a.id, name: a.name, currency: a.currency }));
  },

  list_pixels: async ({ ad_account_id }) => pick(await graph("GET", `${act(ad_account_id)}/adspixels`, { fields: "id,name" })),

  list_pages: async () => pick(await graph("GET", "me/accounts", { fields: "id,name" })),

  resolve_page_ig: async ({ page_id }) => {
    const r = await graph("GET", page_id, { fields: "instagram_business_account{username}" });
    return r.instagram_business_account?.username ?? null;
  },

  search_targeting: async ({ type, q, limit = 10 }) => {
    const graphType = TARGETING_TYPE[type];
    if (!graphType) throw Object.assign(new Error(`type inválido: ${type}`), { status: 400 });
    const r = await graph("GET", "search", {
      type: graphType, q, limit,
      ...(type === "country" ? { location_types: ["country"] } : {}),
    });
    return (r.data ?? []).map((x) => ({
      id: String(type === "country" ? x.country_code ?? x.key : type === "locale" ? x.key : x.id),
      name: x.name,
      type,
    }));
  },

  list_custom_audiences: async ({ ad_account_id }) =>
    (await graph("GET", `${act(ad_account_id)}/customaudiences`, { fields: "id,name", limit: 200 })).data.map((a) => ({ id: a.id, name: a.name, type: "audience" })),

  list_page_reels: async ({ page_id }) => {
    const page = await graph("GET", page_id, { fields: "instagram_business_account" });
    const ig = page.instagram_business_account?.id;
    if (!ig) return [];
    const media = await graph("GET", `${ig}/media`, { fields: "id,caption,media_product_type,timestamp", limit: 50 });
    return media.data
      .filter((m) => m.media_product_type === "REELS")
      .map((m) => ({ id: m.id, name: (m.caption ?? "Reel").slice(0, 80), date: m.timestamp.slice(0, 10) }));
  },

  get_insights: async ({ object_id, date_preset = "maximum", level = "ad" }) =>
    (await graph("GET", `${object_id}/insights`, {
      level, date_preset, time_increment: 1, limit: 500,
      fields: "ad_id,adset_id,campaign_id,spend,impressions,reach,inline_link_clicks,actions,date_start",
    })).data,

  // ---------- escrita (tudo nasce PAUSADO; ative depois pela UI) ----------
  create_campaign: async ({ ad_account_id, name, objective = "OUTCOME_SALES" }) =>
    graph("POST", `${act(ad_account_id)}/campaigns`, {
      name, objective, status: "PAUSED", special_ad_categories: [], buying_type: "AUCTION",
    }),

  create_adset: async ({ ad_account_id, campaign_id, name, daily_budget, targeting, pixel_id, start_time, end_time }) =>
    graph("POST", `${act(ad_account_id)}/adsets`, {
      name, campaign_id, status: "PAUSED",
      daily_budget: Math.round(Number(daily_budget) * 100), // em centavos
      billing_event: "IMPRESSIONS",
      optimization_goal: "OFFSITE_CONVERSIONS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      promoted_object: { pixel_id, custom_event_type: "OTHER" },
      targeting, start_time, end_time,
    }),

  upload_video: async ({ ad_account_id, file_url, name }) =>
    graph("POST", `${act(ad_account_id)}/advideos`, { file_url, name }),

  create_ad_creative: async ({ ad_account_id, name, page_id, ig_user_id, video_id, link, message, source_instagram_media_id }) =>
    graph("POST", `${act(ad_account_id)}/adcreatives`, source_instagram_media_id
      ? { name, object_id: page_id, instagram_user_id: ig_user_id, source_instagram_media_id }
      : {
          name,
          object_story_spec: {
            page_id,
            instagram_user_id: ig_user_id,
            video_data: { video_id, message, call_to_action: { type: "LISTEN_NOW", value: { link } } },
          },
        }),

  create_ad: async ({ ad_account_id, adset_id, creative_id, name }) =>
    graph("POST", `${act(ad_account_id)}/ads`, { name, adset_id, creative: { creative_id }, status: "PAUSED" }),

  update_status: async ({ ids, status }) => {
    if (!["ACTIVE", "PAUSED", "ARCHIVED"].includes(status)) throw Object.assign(new Error("status inválido"), { status: 400 });
    return Promise.all(ids.map((id) => graph("POST", id, { status })));
  },
};

createServer(async (req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (req.method !== "POST" || req.url !== "/api/meta") return send(404, { error: "not found" });

  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1e6) return send(413, { error: "payload grande demais" });
  }
  let payload;
  try {
    payload = JSON.parse(raw || "{}");
  } catch {
    return send(400, { error: "JSON inválido" });
  }
  const { action, ...params } = payload;
  const fn = actions[action];
  if (!fn) return send(400, { error: `action desconhecida: ${action}` });

  try {
    send(200, { data: await fn(params) });
  } catch (e) {
    console.error(`[${action}]`, e.message);
    send(e.status ?? 500, { error: e.message });
  }
}).listen(PORT, () => console.log(`Meta proxy em http://localhost:${PORT}/api/meta (Graph ${VERSION})`));
