// Sliding window in-memory rate limiter.
// Para produção multi-instância, trocar por Upstash Redis.
const store = new Map<string, number[]>()

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const windowStart = now - windowMs

  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart)

  if (timestamps.length >= limit) {
    store.set(key, timestamps)
    return { allowed: false, remaining: 0 }
  }

  timestamps.push(now)
  store.set(key, timestamps)

  // Limpeza periódica para evitar vazamento de memória
  if (store.size > 10_000) {
    for (const [k, v] of store.entries()) {
      if (v.every((t) => t <= windowStart)) store.delete(k)
    }
  }

  return { allowed: true, remaining: limit - timestamps.length }
}
