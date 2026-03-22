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
  process?: ChildProcess
  resolve: () => void
  reject: (error: Error) => void
  promise: Promise<void>
  outputPath: string
  query: string
  started: boolean
}

export default class DownloadManager extends EventEmitter {
  private static readonly MAX_CONCURRENT = 2
  private jobs = new Map<string, DownloadJob>()
  private activeCount = 0
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

    let jobResolve!: () => void
    let jobReject!: (error: Error) => void
    const promise = new Promise<void>((resolve, reject) => {
      jobResolve = resolve
      jobReject = reject
    })

    const job: DownloadJob = {
      id,
      track,
      resolve: jobResolve,
      reject: jobReject,
      promise,
      outputPath: outputTemplate,
      query,
      started: false,
    }
    this.jobs.set(id, job)

    this.tryStartNext()
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
    if (job.process) {
      job.process.kill('SIGTERM')
    }
    job.reject(new Error('Cancelled'))
    this.jobs.delete(downloadId)
    if (job.started) {
      this.activeCount--
      this.cleanupPartialFiles(job.outputPath)
      this.tryStartNext()
    }
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

  private tryStartNext(): void {
    if (this.activeCount >= DownloadManager.MAX_CONCURRENT) return

    for (const job of this.jobs.values()) {
      if (!job.started) {
        this.spawnJob(job)
        if (this.activeCount >= DownloadManager.MAX_CONCURRENT) break
      }
    }
  }

  private spawnJob(job: DownloadJob): void {
    job.started = true
    this.activeCount++

    const binPath = env.YTDL_BIN_PATH || 'yt-dlp'
    const args = this.buildArgs(job.query, job.outputPath)
    const proc = spawn(binPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    job.process = proc

    this.logger.info(
      `Download started (${this.activeCount}/${DownloadManager.MAX_CONCURRENT}): "${job.track.title}"`
    )

    let stderrBuffer = ''

    proc.stderr?.on('data', (chunk: Buffer) => {
      stderrBuffer += chunk.toString()
      const lines = stderrBuffer.split('\n')
      stderrBuffer = lines.pop() || ''

      for (const line of lines) {
        const progress = this.parseProgress(line)
        if (progress) {
          this.emit('progress', job.id, progress)
        }
      }
    })

    proc.on('close', (code) => {
      this.activeCount--

      if (code === 0) {
        job.track.status = 'ready'
        const resolvedPath = this.findOutputFile(job.outputPath)
        if (resolvedPath) {
          job.track.resolvedPath = resolvedPath
        }
        this.emit('complete', job.id)
        job.resolve()
      } else if (job.track.status === 'downloading') {
        const error = new Error(`yt-dlp exited with code ${code}`)
        job.track.status = 'error'
        job.track.error = error.message
        this.emit('error', job.id, error)
        job.reject(error)
      }

      this.jobs.delete(job.id)
      this.tryStartNext()
    })

    proc.on('error', (error) => {
      this.activeCount--
      job.track.status = 'error'
      job.track.error = error.message
      this.emit('error', job.id, error)
      job.reject(error)
      this.jobs.delete(job.id)
      this.tryStartNext()
    })
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
