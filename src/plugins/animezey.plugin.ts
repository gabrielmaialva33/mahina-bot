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
  files: Array<{
    mimeType: string
    name: string
    modifiedTime: string
    id: string
    driveId: string
    link: string
  }>
}

export class AnimezeyPlugin {
  BASE_URL = 'https://animezey16082023.animezey16082023.workers.dev'

  SESSION_HEADERS = {
    'Host': 'animezey16082023.animezey16082023.workers.dev',
    'Connection': 'keep-alive',
    'sec-ch-ua': '"Chromium";v="124", "Microsoft Edge";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-platform': '"macOS"',
    'DNT': '1',
    'sec-ch-ua-mobile': '?0',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
    'Content-Type': 'application/json',
    'Accept': '*/*',
    'Origin': 'https://animezey16082023.animezey16082023.workers.dev',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Referer': 'https://animezey16082023.animezey16082023.workers.dev/0:search?q=a',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    'Cookie': 'perf_dv6Tr4n=1',
    'sec-gpc': '1',
  }

  DOWNLOAD_HEADERS = {
    'Host': 'animezey16082023.animezey16082023.workers.dev',
    'Connection': 'keep-alive',
    'sec-ch-ua': '"Chromium";v="124", "Microsoft Edge";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-platform': '"macOS"',
    'DNT': '1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
    'Accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-User': '?1',
    'Sec-Fetch-Dest': 'document',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    'Cookie': 'perf_dv6Tr4n=1',
    'sec-gpc': '1',
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

  async download(fileName: string, link: string) {
    console.log(`Iniciando download de: ${fileName}`)
    console.log(`Link: ${link}`)

    const sanitizedFileName = fileName.replace(/[\/\?<>\\:\*\|":]/g, '_') // Remover caracteres inválidos
    const filePath = path.join(process.cwd(), 'movies', sanitizedFileName)

    console.log(`Iniciando o download para: ${filePath}`)

    const writer = fs.createWriteStream(filePath)
    const dUrl = `${this.BASE_URL}${link}`

    try {
      const response = await axios({
        url: dUrl,
        method: 'GET',
        headers: this.DOWNLOAD_HEADERS,
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
      console.error('Erro na requisição de download:', error)
      throw error
    }
  }
}
