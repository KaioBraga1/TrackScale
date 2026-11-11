const API_VERSION = 'v27.0'
const BASE = `https://graph.facebook.com/${API_VERSION}`

async function metaFetch<T>(endpoint: string, token: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${endpoint}`)
  url.searchParams.set('access_token', token)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { next: { revalidate: 300 } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
    throw new Error((err as { error?: { message: string } })?.error?.message ?? `Meta API ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const META_REDIRECT_PATH = '/api/auth/meta/callback'

export function getMetaOAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? '',
    redirect_uri: redirectUri,
    scope: 'ads_read,ads_management',
    response_type: 'code',
    state,
  })
  return `https://www.facebook.com/${API_VERSION}/dialog/oauth?${params}`
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{ access_token: string; token_type: string; expires_in?: number }> {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? '',
    client_secret: process.env.META_APP_SECRET ?? '',
    redirect_uri: redirectUri,
    code,
  })
  const res = await fetch(`${BASE}/oauth/access_token?${params}`)
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error((detail as { error?: { message?: string } })?.error?.message ?? 'Failed to exchange code for Meta token')
  }
  return res.json()
}

export async function getLongLivedToken(shortToken: string): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID ?? '',
    client_secret: process.env.META_APP_SECRET ?? '',
    fb_exchange_token: shortToken,
  })
  const res = await fetch(`${BASE}/oauth/access_token?${params}`)
  if (!res.ok) throw new Error('Failed to get long-lived Meta token')
  return res.json()
}

export async function getMetaMe(token: string): Promise<{ id: string; name: string }> {
  return metaFetch<{ id: string; name: string }>('/me', token, { fields: 'id,name' })
}

export interface AdAccount {
  id: string
  name: string
  account_id: string
  currency: string
  account_status: number
  amount_spent: string
}

export async function getAdAccounts(token: string): Promise<AdAccount[]> {
  const data = await metaFetch<{ data: AdAccount[] }>('/me/adaccounts', token, {
    fields: 'name,account_id,currency,account_status,amount_spent',
    limit: '20',
  })
  return data.data ?? []
}

export interface MetaAction {
  action_type: string
  value: string
}

export interface MetaInsights {
  impressions: string
  reach: string
  clicks: string
  spend: string
  ctr: string
  cpc: string
  cpp: string
  frequency: string
  unique_clicks?: string
  unique_ctr?: string
  actions?: MetaAction[]
  cost_per_action_type?: MetaAction[]
}

export interface MetaCampaign {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  objective: string
  daily_budget?: string
  lifetime_budget?: string
  start_time?: string
  stop_time?: string
  insights?: { data: MetaInsights[] }
}

type DatePreset = 'today' | 'last_7d' | 'last_30d' | 'this_month' | 'last_month'

export async function getCampaigns(token: string, adAccountId: string, datePreset: DatePreset = 'last_30d'): Promise<MetaCampaign[]> {
  const data = await metaFetch<{ data: MetaCampaign[] }>(
    `/act_${adAccountId}/campaigns`,
    token,
    {
      fields: `id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,insights.date_preset(${datePreset}){impressions,reach,clicks,spend,ctr,cpc,cpp,frequency,actions,cost_per_action_type}`,
      limit: '50',
    }
  )
  return data.data ?? []
}

export async function getAccountInsights(token: string, adAccountId: string, datePreset: DatePreset = 'last_30d'): Promise<MetaInsights | null> {
  const data = await metaFetch<{ data: MetaInsights[] }>(
    `/act_${adAccountId}/insights`,
    token,
    {
      fields: 'impressions,reach,clicks,spend,ctr,cpc,cpp,frequency,actions,cost_per_action_type,unique_clicks,unique_ctr',
      date_preset: datePreset,
    }
  )
  return data.data?.[0] ?? null
}

export function fmtMoney(value: string | number | undefined, currency = 'USD'): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0)
  if (isNaN(num)) return '$0'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)
}

export function fmtNum(value: string | number | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0)
  if (isNaN(num)) return '0'
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toFixed(0)
}

export function fmtPct(value: string | number | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0)
  if (isNaN(num)) return '0%'
  return `${num.toFixed(2)}%`
}

export function getActionValue(actions: MetaAction[] | undefined, type: string): number {
  return parseInt(actions?.find(a => a.action_type === type)?.value ?? '0') || 0
}

export function getCostPerAction(costPerAction: MetaAction[] | undefined, type: string): string | null {
  const v = costPerAction?.find(a => a.action_type === type)?.value
  return v ?? null
}

export const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_TRAFFIC: 'Traffic',
  OUTCOME_AWARENESS: 'Awareness',
  OUTCOME_ENGAGEMENT: 'Engagement',
  OUTCOME_LEADS: 'Leads',
  OUTCOME_SALES: 'Sales',
  OUTCOME_APP_PROMOTION: 'App Promotion',
  LINK_CLICKS: 'Link Clicks',
  POST_ENGAGEMENT: 'Engagement',
  PAGE_LIKES: 'Page Likes',
  BRAND_AWARENESS: 'Brand Awareness',
  REACH: 'Reach',
  VIDEO_VIEWS: 'Video Views',
  CONVERSIONS: 'Conversions',
  MESSAGES: 'Messages',
  LEAD_GENERATION: 'Lead Gen',
}
