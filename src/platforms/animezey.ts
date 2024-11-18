import axios from 'axios'
import fs from 'node:fs'
import path from 'node:path'

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
  BASE_URL = 'https://animezey16082023.animezey16082023.workers.dev'

  SESSION_HEADERS = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
    'Content-Type': 'application/json',
    'Accept': '*/*',
  }

  async request(endpoint: string, method: 'GET' | 'POST', data: any = null) {
    try {
      const response = await axios({
        method: method,
        url: this.BASE_URL + endpoint,
        headers: this.SESSION_HEADERS,
        data: data,
      })
      return response.data
    } catch (error) {
      console.error(error)
      return null
    }
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

  async download(fileName: string, link: string) {
    const sanitizedFileName = fileName.replace(/[\/\?<>\\:\*\|":]/g, '_')
    const filePath = path.join(process.cwd(), 'downloads', sanitizedFileName)

    const writer = fs.createWriteStream(filePath)
    const dUrl = `${this.BASE_URL}${link}`

    try {
      const response = await axios({
        url: dUrl,
        method: 'GET',
        headers: this.SESSION_HEADERS,
        responseType: 'stream',
      })

      response.data.pipe(writer)

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`Download concluído: ${filePath}`)
          resolve(filePath)
        })
        writer.on('error', (error) => {
          console.error(`Erro no download: ${error.message}`)
          reject(error)
        })
      })
    } catch (error) {
      console.error(error)
      throw error
    }
  }
}
