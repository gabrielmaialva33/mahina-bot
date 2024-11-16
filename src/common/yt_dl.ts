import path from 'node:path'
import { fileURLToPath } from 'node:url'

import youtubedl from 'youtube-dl-exec'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default class YtDl {
  private outputDir: string = path.join(dirname, '../../downloads')

  async downloadVideo(url: string, options = {}) {
    try {
      const outputFilePath = path.join(this.outputDir, '%(title)s.%(ext)s')

      const defaultOptions = {
        output: outputFilePath,
        format: 'bestvideo+bestaudio/best',
        verbose: true,
      }

      const finalOptions = { ...defaultOptions, ...options }

      console.log(`Iniciando download de: ${url}`)
      await youtubedl(url, finalOptions)
      console.log(`Download concluído e salvo em: ${this.outputDir}`)
    } catch (error) {
      console.error('Erro ao baixar vídeo:', error)
    }
  }
}
