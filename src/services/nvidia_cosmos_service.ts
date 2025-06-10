import axios from 'axios'
import type MahinaBot from '#common/mahina_bot'
import { logger } from '#common/logger'

interface CosmosRequest {
  prompt: string
  image?: string // Base64 encoded image
  video?: string // Base64 encoded video
  num_frames?: number
  fps?: number
  width?: number
  height?: number
  guidance_scale?: number
  num_inference_steps?: number
  seed?: number
}

interface CosmosResponse {
  video_url?: string
  video_data?: string // Base64 encoded
  frames?: string[] // Array of base64 encoded frames
  metadata?: {
    duration: number
    fps: number
    width: number
    height: number
    frames: number
  }
}

export class NvidiaCosmosService {
  private client: MahinaBot
  private baseUrl: string
  private apiKey: string
  private model: string = 'cosmos-predict1-7b'

  constructor(client: MahinaBot) {
    this.client = client
    this.baseUrl =
      process.env.NVIDIA_COSMOS_API_URL || 'https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions'
    this.apiKey = process.env.NVIDIA_API_KEY || ''

    if (!this.apiKey) {
      logger.warn('NVIDIA_API_KEY not found. Cosmos service will be disabled.')
    }
  }

  /**
   * Generate physics-aware video from text and image prompts
   */
  async generateVideo(
    prompt: string,
    options: {
      image?: Buffer
      video?: Buffer
      numFrames?: number
      fps?: number
      width?: number
      height?: number
      guidanceScale?: number
      steps?: number
      seed?: number
    } = {}
  ): Promise<CosmosResponse | null> {
    if (!this.apiKey) {
      logger.error('NVIDIA API key not configured')
      return null
    }

    try {
      const request: CosmosRequest = {
        prompt,
        num_frames: options.numFrames || 16,
        fps: options.fps || 8,
        width: options.width || 512,
        height: options.height || 512,
        guidance_scale: options.guidanceScale || 7.5,
        num_inference_steps: options.steps || 20,
        seed: options.seed || Math.floor(Math.random() * 1000000),
      }

      // Add image if provided
      if (options.image) {
        request.image = options.image.toString('base64')
      }

      // Add video if provided
      if (options.video) {
        request.video = options.video.toString('base64')
      }

      logger.info(`Generating physics-aware video: "${prompt.substring(0, 50)}..."`)

      const response = await axios.post(`${this.baseUrl}/${this.model}`, request, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 120000, // 2 minutes for video generation
      })

      if (response.data) {
        logger.info('Cosmos video generation successful')
        return response.data
      }

      logger.error('Invalid Cosmos response format')
      return null
    } catch (error) {
      logger.error('Cosmos video generation failed:', error)
      return null
    }
  }

  /**
   * Generate world state prediction from image
   */
  async predictWorldState(
    image: Buffer,
    prompt?: string,
    options: {
      numFrames?: number
      fps?: number
      guidanceScale?: number
    } = {}
  ): Promise<CosmosResponse | null> {
    const fullPrompt = prompt || 'Predict the next frames showing realistic physics and motion'

    return await this.generateVideo(fullPrompt, {
      image,
      numFrames: options.numFrames || 8,
      fps: options.fps || 4,
      guidanceScale: options.guidanceScale || 6.0,
    })
  }

  /**
   * Generate music-themed visual content
   */
  async generateMusicVisualization(
    musicInfo: {
      title: string
      artist: string
      genre?: string
      mood?: string
    },
    options: {
      style?: 'abstract' | 'realistic' | 'cyberpunk' | 'neon' | 'minimalist'
      includeText?: boolean
      numFrames?: number
    } = {}
  ): Promise<CosmosResponse | null> {
    const style = options.style || 'abstract'
    const includeText = options.includeText || false

    let prompt = this.buildMusicVisualizationPrompt(musicInfo, style, includeText)

    return await this.generateVideo(prompt, {
      numFrames: options.numFrames || 24,
      fps: 12,
      width: 768,
      height: 768,
      guidanceScale: 8.0,
    })
  }

  /**
   * Build prompt for music visualization
   */
  private buildMusicVisualizationPrompt(
    musicInfo: { title: string; artist: string; genre?: string; mood?: string },
    style: string,
    includeText: boolean
  ): string {
    let prompt = ''

    // Base visualization prompt
    const stylePrompts = {
      abstract: 'Abstract flowing shapes and colors dancing to music rhythm',
      realistic: 'Realistic concert stage with dynamic lighting and effects',
      cyberpunk: 'Futuristic cyberpunk music visualization with neon lights and digital elements',
      neon: 'Vibrant neon music visualization with electric colors and pulsing lights',
      minimalist:
        'Clean minimalist music visualization with geometric shapes and smooth animations',
    }

    prompt = stylePrompts[style] || stylePrompts.abstract

    // Add genre-specific elements
    if (musicInfo.genre) {
      const genreElements = {
        rock: ', electric guitar energy, rock concert atmosphere',
        pop: ', colorful pop music vibes, upbeat energy',
        electronic: ', digital waves, synthesizer effects, electronic patterns',
        classical: ', elegant orchestral elements, sophisticated movements',
        jazz: ', smooth jazz club atmosphere, warm golden lighting',
        hip_hop: ', urban street style, rhythmic beats visualization',
        reggae: ', relaxed tropical vibes, warm colors',
      }

      const genreKey = musicInfo.genre.toLowerCase().replace(/[^a-z]/g, '_')
      if (genreElements[genreKey]) {
        prompt += genreElements[genreKey]
      }
    }

    // Add mood-specific elements
    if (musicInfo.mood) {
      const moodElements = {
        happy: ', bright cheerful colors, uplifting movement',
        sad: ', melancholic blue tones, gentle flowing motion',
        energetic: ', dynamic fast-paced animations, vibrant colors',
        calm: ', peaceful serene colors, slow gentle movements',
        aggressive: ', intense red and orange colors, sharp dynamic shapes',
        romantic: ', soft pink and purple hues, heart-like flowing patterns',
      }

      const moodKey = musicInfo.mood.toLowerCase().replace(/[^a-z]/g, '_')
      if (moodElements[moodKey]) {
        prompt += moodElements[moodKey]
      }
    }

    // Add text overlay if requested
    if (includeText) {
      prompt += `, with elegant text overlay showing "${musicInfo.title}" by ${musicInfo.artist}`
    }

    // Add physics and quality directives
    prompt +=
      ', physics-aware motion, smooth transitions, high quality, 4K resolution, professional music video style'

    return prompt
  }

  /**
   * Create visualization for current playing track
   */
  async createNowPlayingVisualization(
    guildId: string,
    options: {
      style?: 'abstract' | 'realistic' | 'cyberpunk' | 'neon' | 'minimalist'
      includeText?: boolean
    } = {}
  ): Promise<CosmosResponse | null> {
    const player = this.client.manager.getPlayer(guildId)

    if (!player?.playing || !player.queue.current) {
      logger.warn('No music currently playing for visualization')
      return null
    }

    const track = player.queue.current
    const musicInfo = {
      title: track.info.title,
      artist: track.info.author,
      genre: this.detectGenreFromTitle(track.info.title + ' ' + track.info.author),
      mood: this.detectMoodFromTitle(track.info.title),
    }

    return await this.generateMusicVisualization(musicInfo, options)
  }

  /**
   * Simple genre detection from title/artist
   */
  private detectGenreFromTitle(text: string): string {
    const lowerText = text.toLowerCase()

    if (lowerText.includes('rock') || lowerText.includes('metal')) return 'rock'
    if (
      lowerText.includes('pop') ||
      lowerText.includes('taylor swift') ||
      lowerText.includes('ariana grande')
    )
      return 'pop'
    if (
      lowerText.includes('electronic') ||
      lowerText.includes('edm') ||
      lowerText.includes('skrillex')
    )
      return 'electronic'
    if (
      lowerText.includes('classical') ||
      lowerText.includes('mozart') ||
      lowerText.includes('beethoven')
    )
      return 'classical'
    if (lowerText.includes('jazz') || lowerText.includes('blues')) return 'jazz'
    if (lowerText.includes('hip hop') || lowerText.includes('rap') || lowerText.includes('drake'))
      return 'hip_hop'
    if (lowerText.includes('reggae') || lowerText.includes('bob marley')) return 'reggae'

    return 'pop' // Default fallback
  }

  /**
   * Simple mood detection from title
   */
  private detectMoodFromTitle(title: string): string {
    const lowerTitle = title.toLowerCase()

    if (
      lowerTitle.includes('happy') ||
      lowerTitle.includes('joy') ||
      lowerTitle.includes('celebration')
    )
      return 'happy'
    if (lowerTitle.includes('sad') || lowerTitle.includes('cry') || lowerTitle.includes('lonely'))
      return 'sad'
    if (
      lowerTitle.includes('energy') ||
      lowerTitle.includes('party') ||
      lowerTitle.includes('dance')
    )
      return 'energetic'
    if (lowerTitle.includes('calm') || lowerTitle.includes('peace') || lowerTitle.includes('relax'))
      return 'calm'
    if (lowerTitle.includes('fight') || lowerTitle.includes('war') || lowerTitle.includes('battle'))
      return 'aggressive'
    if (
      lowerTitle.includes('love') ||
      lowerTitle.includes('heart') ||
      lowerTitle.includes('romance')
    )
      return 'romantic'

    return 'happy' // Default positive mood
  }

  /**
   * Check if Cosmos service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey
  }

  /**
   * Get supported video formats and specifications
   */
  getSupportedFormats(): {
    maxFrames: number
    maxFPS: number
    maxResolution: { width: number; height: number }
    formats: string[]
  } {
    return {
      maxFrames: 48,
      maxFPS: 24,
      maxResolution: { width: 1024, height: 1024 },
      formats: ['mp4', 'webm', 'gif'],
    }
  }
}
