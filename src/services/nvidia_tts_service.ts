import axios from 'axios'
import type MahinaBot from '#common/mahina_bot'
import { logger } from '#common/logger'

interface TTSRequest {
  input: string
  voice_id?: string
  language?: string
  speed?: number
  pitch?: number
}

interface TTSResponse {
  audio_url: string
  audio_data?: Buffer
  duration?: number
}

export class NvidiaTTSService {
  private client: MahinaBot
  private baseUrl: string
  private apiKey: string
  private defaultVoice: string = 'multilingual_female_1'

  constructor(client: MahinaBot) {
    this.client = client
    this.baseUrl =
      process.env.NVIDIA_TTS_API_URL || 'https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions'
    this.apiKey = process.env.NVIDIA_API_KEY || ''

    if (!this.apiKey) {
      logger.warn('NVIDIA_API_KEY not found. TTS service will be disabled.')
    }
  }

  /**
   * Convert text to speech using NVIDIA Magpie TTS
   */
  async textToSpeech(
    text: string,
    options: {
      voice?: string
      language?: string
      speed?: number
      pitch?: number
    } = {}
  ): Promise<TTSResponse | null> {
    if (!this.apiKey) {
      logger.error('NVIDIA API key not configured')
      return null
    }

    try {
      const request: TTSRequest = {
        input: text,
        voice_id: options.voice || this.defaultVoice,
        language: options.language || 'pt-BR',
        speed: options.speed || 1.0,
        pitch: options.pitch || 0.0,
      }

      logger.info(`Converting text to speech: "${text.substring(0, 50)}..."`)

      const response = await axios.post(`${this.baseUrl}/magpie-tts-multilingual`, request, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 30000,
      })

      if (response.data && response.data.audio_url) {
        logger.info('TTS generation successful')
        return {
          audio_url: response.data.audio_url,
          audio_data: response.data.audio_data
            ? Buffer.from(response.data.audio_data, 'base64')
            : undefined,
          duration: response.data.duration,
        }
      }

      logger.error('Invalid TTS response format')
      return null
    } catch (error) {
      logger.error('TTS generation failed:', error)
      return null
    }
  }

  /**
   * Get available voices for TTS
   */
  async getAvailableVoices(): Promise<string[]> {
    return [
      'multilingual_female_1',
      'multilingual_female_2',
      'multilingual_male_1',
      'multilingual_male_2',
      'portuguese_female_1',
      'portuguese_male_1',
      'english_female_1',
      'english_male_1',
    ]
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<Record<string, string>> {
    return {
      'pt-BR': 'Português (Brasil)',
      'pt-PT': 'Português (Portugal)',
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'es-ES': 'Español',
      'fr-FR': 'Français',
      'de-DE': 'Deutsch',
      'it-IT': 'Italiano',
      'ja-JP': '日本語',
      'ko-KR': '한국어',
      'zh-CN': '中文',
    }
  }

  /**
   * Check if TTS service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey
  }

  /**
   * Clean text for TTS (remove markdown, special characters, etc.)
   */
  cleanTextForTTS(text: string): string {
    return text
      .replace(/[*_~`]/g, '') // Remove markdown
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/^\s*[-*+]\s/gm, '') // Remove list markers
      .replace(/\n{2,}/g, '. ') // Convert line breaks to pauses
      .replace(/[^\w\s.,!?;:()\-áàâãéèêíïóôõöúçñü]/gi, '') // Keep only safe characters
      .trim()
  }

  /**
   * Validate text length for TTS
   */
  validateTextLength(text: string): { valid: boolean; message?: string } {
    const maxLength = 5000 // NVIDIA TTS limit

    if (text.length === 0) {
      return { valid: false, message: 'Text cannot be empty' }
    }

    if (text.length > maxLength) {
      return {
        valid: false,
        message: `Text too long. Maximum ${maxLength} characters allowed.`,
      }
    }

    return { valid: true }
  }
}
