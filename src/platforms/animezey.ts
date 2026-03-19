import axios from 'axios'

export interface SearchResponse {
  nextPageToken: string
  curPageIndex: number
  data: SearchDataResponse
}

export interface SearchDataResponse {
  nextPageToken: string
  files: Array<FileResponse>
}

export interface FileResponse {
  kind: string
  fileExtension: string
  size: string
  name: string
  modifiedTime: string
  id: string
  driveId: string
  mimeType: string
  link: string
}

export class AnimeZey {
  readonly baseUrl = 'https://animezey16082023.animezey16082023.workers.dev'

  private readonly headers = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
    'Content-Type': 'application/json',
    'Accept': '*/*',
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    data?: Record<string, unknown>
  ): Promise<T | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await axios({
          method,
          url: this.baseUrl + endpoint,
          headers: this.headers,
          data,
          timeout: 10_000,
        })
        return response.data as T
      } catch {
        if (attempt === 1) return null
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
    return null
  }

  async searchAnime(query: string, pageToken?: string | null): Promise<SearchResponse | null> {
    return this.request('/0:search', 'POST', {
      q: query,
      page_token: pageToken || null,
      page_index: 0,
    })
  }

  async searchMovie(query: string, pageToken?: string | null): Promise<SearchResponse | null> {
    return this.request('/1:search', 'POST', {
      q: query,
      page_token: pageToken || null,
      page_index: 0,
    })
  }

  getStreamUrl(file: FileResponse): string {
    return `${this.baseUrl}${file.link}`
  }
}

export function formatFileSize(bytes: string | number): string {
  const b = typeof bytes === 'string' ? Number.parseInt(bytes, 10) : bytes
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(2)} GB`
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${b} B`
}

export function formatDisplayName(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/\[([^\]]*)\]/g, '`$1`')
    .trim()
}
