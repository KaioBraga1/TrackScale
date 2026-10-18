import { createHash } from 'node:crypto'

const CAPI_VERSION = 'v21.0'
const CAPI_ENDPOINT = `https://graph.facebook.com/${CAPI_VERSION}`

export interface CapiEventData {
  pixelId: string
  accessToken: string
  eventName: 'PageView' | 'ViewContent' | 'Lead'
  eventId: string
  eventSourceUrl: string
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
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE

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

  if (testEventCode) payload.test_event_code = testEventCode

  const url = `${CAPI_ENDPOINT}/${data.pixelId}/events?access_token=${data.accessToken}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
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

// Fire-and-forget: nunca quebra o fluxo do visitante
export function sendCapiEventSilent(data: CapiEventData): void {
  sendCapiEvent(data).catch((err) => {
    console.error('[capi] erro silenciado:', err instanceof Error ? err.message : 'unknown')
  })
}
