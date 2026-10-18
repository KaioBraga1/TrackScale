import { isIP } from 'node:net'

export interface GeoResult {
  country: string | null
  region: string | null
  city: string | null
  zipCode: string | null
  latitude: number | null
  longitude: number | null
  isDatacenter: boolean
}

const GEO_CACHE_TTL_MS = 15 * 60 * 1000
const geoCache = new Map<
  string,
  { expiresAt: number; result: Promise<GeoResult | null> }
>()

export async function getGeoFromIP(ip: string): Promise<GeoResult | null> {
  if (isPrivateIP(ip)) {
    return {
      country: 'Local',
      region: null,
      city: null,
      zipCode: null,
      latitude: null,
      longitude: null,
      isDatacenter: false,
    }
  }

  const now = Date.now()
  const cached = geoCache.get(ip)
  if (cached && cached.expiresAt > now) return cached.result

  const entry = { expiresAt: now + 30_000, result: lookupGeo(ip) }
  geoCache.set(ip, entry)
  void entry.result.then((geo) => {
    if (geo && geoCache.get(ip) === entry) {
      entry.expiresAt = Date.now() + GEO_CACHE_TTL_MS
    }
  })

  if (geoCache.size > 5_000) {
    for (const [key, value] of geoCache) {
      if (value.expiresAt <= now) geoCache.delete(key)
    }
    while (geoCache.size > 5_000) {
      const oldestKey = geoCache.keys().next().value
      if (!oldestKey) break
      geoCache.delete(oldestKey)
    }
  }

  return entry.result
}

async function lookupGeo(ip: string): Promise<GeoResult | null> {
  try {
    // ip-api.com free tier includes the hosting flag used for datacenter detection.
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,zip,lat,lon,hosting`,
      {
        signal: AbortSignal.timeout(2000),
        headers: { Accept: 'application/json' },
      }
    )
    if (!res.ok) {
      console.warn('[geo] IP lookup returned HTTP', res.status)
      return null
    }
    const d = await res.json()
    if (d.status !== 'success') {
      console.warn('[geo] IP lookup did not return a successful result')
      return null
    }
    return {
      country: d.country ?? null,
      region: d.regionName ?? null,
      city: d.city ?? null,
      zipCode: d.zip ?? null,
      latitude: typeof d.lat === 'number' ? d.lat : null,
      longitude: typeof d.lon === 'number' ? d.lon : null,
      isDatacenter: !!d.hosting,
    }
  } catch (err) {
    console.warn(
      '[geo] IP lookup failed:',
      err instanceof Error ? err.message : 'unknown error'
    )
    return null
  }
}

function isPrivateIP(ip: string): boolean {
  const version = isIP(ip)
  if (version === 0) return true

  if (version === 6) {
    const normalized = ip.toLowerCase()
    if (normalized.startsWith('::ffff:')) {
      return isPrivateIP(normalized.slice('::ffff:'.length))
    }
    return (
      normalized === '::' ||
      normalized === '::1' ||
      /^f[cd]/.test(normalized) ||
      /^fe[89ab]/.test(normalized)
    )
  }

  const [first, second] = ip.split('.').map(Number)
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  )
}
