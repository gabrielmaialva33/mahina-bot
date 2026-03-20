import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { EventEmitter } from 'node:events'

import { env } from '#src/env'
import type { StreamTrack } from '#common/stream_queue'
import type { Logger } from '#common/logger'

export interface DownloadProgress {
  percent: number
  speed: string
  eta: string
  size: string
}

interface DownloadJob {
  id: string
  track: StreamTrack
  process: ChildProcess
  resolve: () => void
  reject: (error: Error) => void
  promise: Promise<void>
  outputPath: string
}

export default class DownloadManager extends EventEmitter {
  private jobs = new Map<string, DownloadJob>()
  private logger: Logger
  private idCounter = 0

  constructor(logger: Logger) {
    super()
    this.logger = logger
  }

  start(track: StreamTrack, query: string, outputTemplate: string): string {
    const id = `dl_${Date.now()}_${++this.idCounter}`
    track.downloadId = id
    track.status = 'downloading'

    const binPath = env.YTDL_BIN_PATH || 'yt-dlp'
    const args = this.buildArgs(query, outputTemplate)

    let jobResolve!: () => void
    let jobReject!: (error: Error) => void
    const promise = new Promise<void>((resolve, reject) => {
      jobResolve = resolve
      jobReject = reject
    })

    const proc = spawn(binPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })

    const job: DownloadJob = {
      id,
      track,
      process: proc,
      resolve: jobResolve,
      reject: jobReject,
      promise,
      outputPath: outputTemplate,
    }
    this.jobs.set(id, job)

    let stderrBuffer = ''

    proc.stderr?.on('data', (chunk: Buffer) => {
      stderrBuffer += chunk.toString()
      const lines = stderrBuffer.split('\n')
      stderrBuffer = lines.pop() || ''

      for (const line of lines) {
        const progress = this.parseProgress(line)
        if (progress) {
          this.emit('progress', id, progress)
        }
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        track.status = 'ready'
        const resolvedPath = this.findOutputFile(outputTemplate)
        if (resolvedPath) {
          track.resolvedPath = resolvedPath
        }
        this.emit('complete', id)
        jobResolve()
      } else if (track.status === 'downloading') {
        const error = new Error(`yt-dlp exited with code ${code}`)
        track.status = 'error'
        track.error = error.message
        this.emit('error', id, error)
        jobReject(error)
      }
      this.jobs.delete(id)
    })

    proc.on('error', (error) => {
      track.status = 'error'
      track.error = error.message
      this.emit('error', id, error)
      jobReject(error)
      this.jobs.delete(id)
    })

    return id
  }

  async waitForReady(track: StreamTrack): Promise<void> {
    if (track.status === 'ready') return
    if (track.status === 'error') throw new Error(track.error || 'Download failed')

    const job = track.downloadId ? this.jobs.get(track.downloadId) : undefined
    if (!job) {
      throw new Error('Download job not found — bot may have restarted')
    }

    await job.promise
  }

  cancel(downloadId: string): void {
    const job = this.jobs.get(downloadId)
    if (!job) return

    job.track.status = 'error'
    job.track.error = 'Cancelled'
    job.process.kill('SIGTERM')
    job.reject(new Error('Cancelled'))
    this.jobs.delete(downloadId)
    this.cleanupPartialFiles(job.outputPath)
  }

  cancelAll(): void {
    for (const [id] of this.jobs) {
      this.cancel(id)
    }
  }

  cancelForTrack(track: StreamTrack): void {
    if (track.downloadId && this.jobs.has(track.downloadId)) {
      this.cancel(track.downloadId)
    }
  }

  private buildArgs(query: string, outputTemplate: string): string[] {
    const args = [
      query,
      '-o',
      outputTemplate,
      '--js-runtimes',
      'node',
      '--remote-components',
      'ejs:github',
      '--extractor-args',
      'youtube:player_client=ios,tv',
      '--no-check-certificates',
      '--cache-dir',
      path.join(process.cwd(), '.cache', 'yt-dlp'),
      '--newline',
    ]

    if (env.YOUTUBE_COOKIES_PATH && fs.existsSync(env.YOUTUBE_COOKIES_PATH)) {
      args.push('--cookies', env.YOUTUBE_COOKIES_PATH)
    }

    return args
  }

  private parseProgress(line: string): DownloadProgress | null {
    // [download]  45.2% of  1.23GiB at   12.3MiB/s ETA 00:42
    const match = line.match(
      /\[download\]\s+([\d.]+)%\s+of\s+~?([\d.]+\S+)\s+at\s+([\d.]+\S+)\s+ETA\s+(\S+)/
    )
    if (!match) return null

    return {
      percent: Number.parseFloat(match[1]),
      size: match[2],
      speed: match[3],
      eta: match[4],
    }
  }

  private cleanupPartialFiles(outputTemplate: string): void {
    const dir = path.dirname(outputTemplate)
    const baseName = path.basename(outputTemplate).replace('.%(ext)s', '')

    try {
      const files = fs.readdirSync(dir)
      for (const file of files) {
        const name = path.parse(file).name
        if (name === baseName || name.startsWith(`${baseName}.`)) {
          const filePath = path.join(dir, file)
          if (file.endsWith('.part') || file.endsWith('.ytdl')) {
            fs.unlinkSync(filePath)
            this.logger.debug(`Cleaned up partial download: ${file}`)
          }
        }
      }
    } catch {
      // ignore cleanup errors
    }
  }

  private findOutputFile(outputTemplate: string): string | null {
    // outputTemplate has %(ext)s, resolve to actual file
    const dir = path.dirname(outputTemplate)
    const baseName = path.basename(outputTemplate).replace('.%(ext)s', '')

    try {
      const files = fs.readdirSync(dir)
      const match = files.find((f) => path.parse(f).name === baseName)
      return match ? path.join(dir, match) : null
    } catch {
      return null
    }
  }
}
