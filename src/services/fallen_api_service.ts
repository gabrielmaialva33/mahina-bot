import { logger } from '#common/logger'

interface FallenTrackResponse {
  id?: string
  url?: string
  cdnurl?: string
  key?: string
  platform?: string
}

export default class FallenApiService {
  private readonly apiUrl: string
  private readonly apiKey: string

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl.replace(/\/+$/, '')
    this.apiKey = apiKey
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiUrl)
  }

  async resolveStreamUrl(uri: string, video = true): Promise<string | null> {
    if (!this.isAvailable()) return null
    try {
      const params = new URLSearchParams({ url: uri })
      if (video) params.set('video', 'true')
      const endpoint = `${this.apiUrl}/api/track?${params.toString()}`
      const res = await fetch(endpoint, {
        headers: { 'X-API-Key': this.apiKey },
        signal: AbortSignal.timeout(20_000),
      })
      if (!res.ok) {
        logger.warn(`FallenAPI: HTTP ${res.status} for ${uri}`)
        return null
      }
      const data = (await res.json()) as FallenTrackResponse
      const cdn = data.cdnurl?.trim()
      if (!cdn) return null
      // t.me URLs are not directly streamable — only sf-converter / direct CDN
      if (cdn.startsWith('https://t.me/')) {
        logger.debug(`FallenAPI: refused Telegram cdnurl for ${uri}`)
        return null
      }
      return cdn
    } catch (err) {
      logger.warn(`FallenAPI: error resolving ${uri}: ${String(err)}`)
      return null
    }
  }
}
