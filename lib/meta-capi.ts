import { createHash } from 'node:crypto'

const CAPI_VERSION = 'v21.0'
const CAPI_ENDPOINT = `https://graph.facebook.com/${CAPI_VERSION}`

export interface CapiEventData {
  pixelId: string
  accessToken: string
  eventName: 'PageView' | 'ViewContent' | 'Lead'
  eventId: string
  eventSourceUrl: string
  // Código do Test Events do pixel (TESTxxxx). Só vai no payload se informado:
  // com ele o evento aparece na hora na aba Test Events e NÃO conta como produção.
  testEventCode?: string | null
  // User data — tudo que for PII é hasheado antes do envio
  clientIp: string
  clientUserAgent: string
  fbclid?: string | null
  fbp?: string | null
  country?: string | null
  state?: string | null
  city?: string | null
  zip?: string | null
  externalId: string // Visitor ID interno, hasheado
}

function sha256(value: string): string {
  return createHash('sha256')
    .update(value.toLowerCase().trim())
    .digest('hex')
}

// Converte fbclid capturado para o formato fbc exigido pelo Meta
// Formato: fb.1.<unix_timestamp_ms>.<fbclid>
function buildFbc(fbclid: string): string {
  return `fb.1.${Date.now()}.${fbclid}`
}

function buildUserData(data: CapiEventData): Record<string, string | undefined> {
  const ud: Record<string, string | undefined> = {
    client_ip_address: data.clientIp,
    client_user_agent: data.clientUserAgent,
    external_id: sha256(data.externalId),
  }

  if (data.fbclid) ud.fbc = buildFbc(data.fbclid)
  if (data.fbp) ud.fbp = data.fbp
  if (data.country) ud.country = sha256(data.country)
  if (data.state) ud.st = sha256(data.state)
  if (data.city) ud.ct = sha256(data.city)
  if (data.zip) ud.zp = sha256(data.zip)

  return ud
}

export async function sendCapiEvent(data: CapiEventData): Promise<void> {
  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: data.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: data.eventId,
        event_source_url: data.eventSourceUrl,
        action_source: 'website',
        user_data: buildUserData(data),
      },
    ],
  }

  if (data.testEventCode) payload.test_event_code = data.testEventCode

  const url = `${CAPI_ENDPOINT}/${data.pixelId}/events?access_token=${data.accessToken}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(3000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    // Log estruturado sem expor o token
    console.error('[capi] envio falhou', {
      pixelId: data.pixelId,
      eventName: data.eventName,
      eventId: data.eventId,
      status: res.status,
      body: body.slice(0, 300),
    })
    throw new Error(`CAPI HTTP ${res.status}`)
  }
}

// Nunca rejeita, então não quebra o fluxo do visitante. Deve ser aguardada
// (await) pela rota: em serverless, a função pode ser congelada logo após a
// resposta e um fetch solto se perderia.
export async function sendCapiEventSilent(data: CapiEventData): Promise<void> {
  try {
    await sendCapiEvent(data)
  } catch (err) {
    console.error('[capi] erro silenciado:', err instanceof Error ? err.message : 'unknown')
  }
}

export interface CapiTestResult {
  ok: boolean
  detail: string
}

// Envio de teste iniciado pelo usuário na aba Tracking. Devolve a resposta real
// do Meta (sem expor o token) para o usuário saber se o pixel + token funcionam.
export async function sendCapiTest(params: {
  pixelId: string
  accessToken: string
  testEventCode: string
  clientIp: string
  clientUserAgent: string
  sourceUrl: string
}): Promise<CapiTestResult> {
  const payload = {
    data: [
      {
        event_name: 'ViewContent',
        event_time: Math.floor(Date.now() / 1000),
        event_id: `test_${Date.now()}`,
        event_source_url: params.sourceUrl,
        action_source: 'website',
        user_data: {
          client_ip_address: params.clientIp,
          client_user_agent: params.clientUserAgent,
        },
        custom_data: { content_name: 'TrackScaler Test Event' },
      },
    ],
    test_event_code: params.testEventCode,
  }

  try {
    const res = await fetch(
      `${CAPI_ENDPOINT}/${params.pixelId}/events?access_token=${params.accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      }
    )
    const json = (await res.json().catch(() => ({}))) as {
      events_received?: number
      error?: { message?: string }
    }
    if (!res.ok) {
      return { ok: false, detail: json.error?.message ?? `HTTP ${res.status}` }
    }
    return { ok: (json.events_received ?? 0) > 0, detail: `events_received=${json.events_received ?? 0}` }
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'network error' }
  }
}
