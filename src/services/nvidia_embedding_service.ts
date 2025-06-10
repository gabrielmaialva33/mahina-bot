import axios from 'axios'
import type MahinaBot from '#common/mahina_bot'
import { logger } from '#common/logger'

interface EmbeddingRequest {
  input: string | string[]
  model?: string
  encoding_format?: 'float' | 'base64'
  dimensions?: number
}

interface EmbeddingResponse {
  object: string
  data: Array<{
    object: string
    embedding: number[]
    index: number
  }>
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

interface SearchResult {
  content: string
  similarity: number
  metadata?: Record<string, any>
}

export class NvidiaEmbeddingService {
  private client: MahinaBot
  private baseUrl: string
  private apiKey: string
  private model: string = 'nv-embedqa-e5-v5'
  private embeddingCache: Map<string, number[]> = new Map()

  constructor(client: MahinaBot) {
    this.client = client
    this.baseUrl = process.env.NVIDIA_EMBEDDING_API_URL || 'https://integrate.api.nvidia.com/v1'
    this.apiKey = process.env.NVIDIA_API_KEY || ''

    if (!this.apiKey) {
      logger.warn('NVIDIA_API_KEY not found. Embedding service will be disabled.')
    }
  }

  /**
   * Generate embeddings for text using NVIDIA NV-EmbedQA
   */
  async generateEmbedding(text: string | string[]): Promise<number[][] | null> {
    if (!this.apiKey) {
      logger.error('NVIDIA API key not configured')
      return null
    }

    try {
      const request: EmbeddingRequest = {
        input: text,
        model: this.model,
        encoding_format: 'float',
      }

      logger.debug(`Generating embeddings for ${Array.isArray(text) ? text.length : 1} text(s)`)

      const response = await axios.post<EmbeddingResponse>(`${this.baseUrl}/embeddings`, request, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 30000,
      })

      if (response.data && response.data.data) {
        const embeddings = response.data.data
          .sort((a, b) => a.index - b.index)
          .map((item) => item.embedding)

        logger.debug(`Generated ${embeddings.length} embeddings successfully`)

        // Cache single embeddings
        if (typeof text === 'string') {
          this.embeddingCache.set(text, embeddings[0])
        }

        return embeddings
      }

      logger.error('Invalid embedding response format')
      return null
    } catch (error) {
      logger.error('Embedding generation failed:', error)
      return null
    }
  }

  /**
   * Get embedding for single text (with cache)
   */
  async getEmbedding(text: string): Promise<number[] | null> {
    // Check cache first
    if (this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text)!
    }

    const embeddings = await this.generateEmbedding(text)
    return embeddings ? embeddings[0] : null
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions')
    }

    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      norm1 += embedding1[i] * embedding1[i]
      norm2 += embedding2[i] * embedding2[i]
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }

  /**
   * Search similar content from a knowledge base
   */
  async searchSimilar(
    query: string,
    knowledgeBase: Array<{ content: string; metadata?: Record<string, any> }>,
    threshold: number = 0.7,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      // Get query embedding
      const queryEmbedding = await this.getEmbedding(query)
      if (!queryEmbedding) {
        logger.error('Failed to generate query embedding')
        return []
      }

      // Generate embeddings for knowledge base if not already done
      const contents = knowledgeBase.map((item) => item.content)
      const contentEmbeddings = await this.generateEmbedding(contents)

      if (!contentEmbeddings) {
        logger.error('Failed to generate knowledge base embeddings')
        return []
      }

      // Calculate similarities and rank results
      const results: SearchResult[] = []

      for (let i = 0; i < knowledgeBase.length; i++) {
        const similarity = this.calculateSimilarity(queryEmbedding, contentEmbeddings[i])

        if (similarity >= threshold) {
          results.push({
            content: knowledgeBase[i].content,
            similarity,
            metadata: knowledgeBase[i].metadata,
          })
        }
      }

      // Sort by similarity and limit results
      return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit)
    } catch (error) {
      logger.error('Search similar failed:', error)
      return []
    }
  }

  /**
   * Build knowledge base from music commands and bot information
   */
  buildMusicKnowledgeBase(): Array<{ content: string; metadata?: Record<string, any> }> {
    return [
      {
        content:
          'Para tocar música use o comando !play seguido do nome da música ou URL. Exemplo: !play Imagine Dragons Believer',
        metadata: { type: 'command', category: 'music', command: 'play' },
      },
      {
        content: 'Para pausar a música atual use !pause. Para retomar use !resume.',
        metadata: { type: 'command', category: 'music', command: 'pause' },
      },
      {
        content:
          'Para pular para a próxima música use !skip. Para pular para uma música específica use !skipto número.',
        metadata: { type: 'command', category: 'music', command: 'skip' },
      },
      {
        content: 'Para ver a fila de reprodução use !queue. Para limpar a fila use !clearqueue.',
        metadata: { type: 'command', category: 'music', command: 'queue' },
      },
      {
        content:
          'Para ajustar o volume use !volume seguido de um número de 1 a 100. Exemplo: !volume 50',
        metadata: { type: 'command', category: 'music', command: 'volume' },
      },
      {
        content:
          'Para repetir a música atual use !loop track. Para repetir a fila inteira use !loop queue.',
        metadata: { type: 'command', category: 'music', command: 'loop' },
      },
      {
        content:
          'Para parar a música e limpar a fila use !stop. Para desconectar o bot use !leave.',
        metadata: { type: 'command', category: 'music', command: 'stop' },
      },
      {
        content: 'Para embaralhar a fila de reprodução use !shuffle.',
        metadata: { type: 'command', category: 'music', command: 'shuffle' },
      },
      {
        content:
          'Para buscar músicas sem tocar imediatamente use !search seguido do nome da música.',
        metadata: { type: 'command', category: 'music', command: 'search' },
      },
      {
        content: 'Para ver informações sobre a música atual use !nowplaying ou !np.',
        metadata: { type: 'command', category: 'music', command: 'nowplaying' },
      },
      {
        content:
          'Para aplicar filtros de áudio use comandos como !bassboost, !8d, !nightcore, !karaoke.',
        metadata: { type: 'command', category: 'filters', command: 'filters' },
      },
      {
        content: 'Para gerenciar playlists use !playlist create, !playlist load, !playlist save.',
        metadata: { type: 'command', category: 'playlist', command: 'playlist' },
      },
      {
        content:
          'O Mahina Bot suporta YouTube, Spotify, SoundCloud, Apple Music e muitas outras plataformas.',
        metadata: { type: 'info', category: 'platform', topic: 'supported_platforms' },
      },
      {
        content:
          'Para obter ajuda com todos os comandos use !help. Para ajuda específica use !help categoria.',
        metadata: { type: 'command', category: 'general', command: 'help' },
      },
    ]
  }

  /**
   * Search for relevant music help based on user query
   */
  async searchMusicHelp(query: string): Promise<SearchResult[]> {
    const knowledgeBase = this.buildMusicKnowledgeBase()
    return await this.searchSimilar(query, knowledgeBase, 0.5, 3)
  }

  /**
   * Check if embedding service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear()
    logger.debug('Embedding cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.embeddingCache.size,
      keys: Array.from(this.embeddingCache.keys()).slice(0, 10), // First 10 keys
    }
  }
}
