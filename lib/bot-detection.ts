export const BOT_THRESHOLD = 0.55

// A confidence score is human-likelihood: higher is more likely to be human.
export function serverHumanScore(userAgent: string, isDatacenter = false): number {
  if (!userAgent || userAgent.trim() === '') return 0

  if (/headless|phantom|selenium|webdriver|puppeteer|playwright/i.test(userAgent)) return 0.02
  if (/bot|crawler|spider|scraper|curl|wget|python-requests|python\/|java\/|go-http|axios|node-fetch|undici|okhttp/i.test(userAgent)) return 0.05

  let score = /Chrome|Firefox|Safari|Edge|Opera/i.test(userAgent) ? 0.95 : 0.55
  if (isDatacenter) score -= 0.55

  return Math.min(1, Math.max(0, score))
}

export function combinedHumanScore(serverScore: number, clientScore: number): number {
  const server = Math.min(1, Math.max(0, serverScore))
  const client = Math.min(1, Math.max(0, clientScore))
  return client * 0.6 + server * 0.4
}

export function isEventFiltered(humanScore: number): boolean {
  return humanScore < BOT_THRESHOLD
}
