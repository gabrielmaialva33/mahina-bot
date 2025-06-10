import axios from 'axios'
import type MahinaBot from '#common/mahina_bot'
import { logger } from '#common/logger'

interface GuardRequest {
  input: string
  model?: string
}

interface GuardResponse {
  is_safe: boolean
  risk_level: 'low' | 'medium' | 'high'
  categories: Array<{
    category: string
    score: number
    flagged: boolean
  }>
  explanation?: string
  suggested_action?: 'allow' | 'warn' | 'block'
}

interface JailbreakDetectionResponse {
  is_jailbreak: boolean
  confidence: number
  techniques_detected: string[]
  risk_assessment: 'low' | 'medium' | 'high'
}

interface ContentSafetyResponse {
  is_safe: boolean
  content_policy_violations: Array<{
    policy: string
    violation_type: string
    severity: 'low' | 'medium' | 'high'
    score: number
  }>
  recommendation: 'approve' | 'review' | 'reject'
}

export class NvidiaGuardService {
  private client: MahinaBot
  private baseUrl: string
  private apiKey: string
  private jailbreakModel: string = 'nemoguard-jailbreak-detect'
  private contentSafetyModel: string = 'llama-3.1-nemoguard-8b-content-safety'
  private topicControlModel: string = 'llama-3.1-nemoguard-8b-topic-control'

  constructor(client: MahinaBot) {
    this.client = client
    this.baseUrl =
      process.env.NVIDIA_GUARD_API_URL || 'https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions'
    this.apiKey = process.env.NVIDIA_API_KEY || ''

    if (!this.apiKey) {
      logger.warn('NVIDIA_API_KEY not found. Guard service will be disabled.')
    }
  }

  /**
   * Detect jailbreak attempts using NVIDIA NemoGuard
   */
  async detectJailbreak(input: string): Promise<JailbreakDetectionResponse | null> {
    if (!this.apiKey) {
      logger.error('NVIDIA API key not configured')
      return null
    }

    try {
      const request: GuardRequest = {
        input,
        model: this.jailbreakModel,
      }

      logger.debug(`Checking for jailbreak attempt: "${input.substring(0, 50)}..."`)

      const response = await axios.post(`${this.baseUrl}/${this.jailbreakModel}`, request, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 15000,
      })

      if (response.data) {
        logger.debug('Jailbreak detection completed')
        return response.data
      }

      logger.error('Invalid jailbreak detection response format')
      return null
    } catch (error) {
      logger.error('Jailbreak detection failed:', error)
      return null
    }
  }

  /**
   * Check content safety using NVIDIA NemoGuard
   */
  async checkContentSafety(input: string): Promise<ContentSafetyResponse | null> {
    if (!this.apiKey) {
      logger.error('NVIDIA API key not configured')
      return null
    }

    try {
      const request: GuardRequest = {
        input,
        model: this.contentSafetyModel,
      }

      logger.debug(`Checking content safety: "${input.substring(0, 50)}..."`)

      const response = await axios.post(`${this.baseUrl}/${this.contentSafetyModel}`, request, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 15000,
      })

      if (response.data) {
        logger.debug('Content safety check completed')
        return response.data
      }

      logger.error('Invalid content safety response format')
      return null
    } catch (error) {
      logger.error('Content safety check failed:', error)
      return null
    }
  }

  /**
   * Control topics to keep conversations focused
   */
  async checkTopicControl(input: string, allowedTopics: string[]): Promise<GuardResponse | null> {
    if (!this.apiKey) {
      logger.error('NVIDIA API key not configured')
      return null
    }

    try {
      const request = {
        input,
        model: this.topicControlModel,
        allowed_topics: allowedTopics,
      }

      logger.debug(`Checking topic control: "${input.substring(0, 50)}..."`)

      const response = await axios.post(`${this.baseUrl}/${this.topicControlModel}`, request, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 15000,
      })

      if (response.data) {
        logger.debug('Topic control check completed')
        return response.data
      }

      logger.error('Invalid topic control response format')
      return null
    } catch (error) {
      logger.error('Topic control check failed:', error)
      return null
    }
  }

  /**
   * Comprehensive safety check combining all guards
   */
  async comprehensiveSafetyCheck(
    input: string,
    context?: {
      allowedTopics?: string[]
      strictMode?: boolean
    }
  ): Promise<{
    is_safe: boolean
    jailbreak_risk: boolean
    content_violations: boolean
    topic_violations: boolean
    overall_risk: 'low' | 'medium' | 'high'
    action: 'allow' | 'warn' | 'block'
    details: {
      jailbreak?: JailbreakDetectionResponse
      content?: ContentSafetyResponse
      topics?: GuardResponse
    }
  }> {
    const results = {
      is_safe: true,
      jailbreak_risk: false,
      content_violations: false,
      topic_violations: false,
      overall_risk: 'low' as 'low' | 'medium' | 'high',
      action: 'allow' as 'allow' | 'warn' | 'block',
      details: {} as any,
    }

    try {
      // Run all checks in parallel for better performance
      const [jailbreakResult, contentResult, topicResult] = await Promise.allSettled([
        this.detectJailbreak(input),
        this.checkContentSafety(input),
        context?.allowedTopics ? this.checkTopicControl(input, context.allowedTopics) : null,
      ])

      // Process jailbreak detection
      if (jailbreakResult.status === 'fulfilled' && jailbreakResult.value) {
        results.details.jailbreak = jailbreakResult.value
        if (jailbreakResult.value.is_jailbreak) {
          results.jailbreak_risk = true
          results.is_safe = false
          if (jailbreakResult.value.risk_assessment === 'high') {
            results.overall_risk = 'high'
            results.action = 'block'
          } else if (results.overall_risk === 'low') {
            results.overall_risk = 'medium'
            results.action = 'warn'
          }
        }
      }

      // Process content safety
      if (contentResult.status === 'fulfilled' && contentResult.value) {
        results.details.content = contentResult.value
        if (!contentResult.value.is_safe) {
          results.content_violations = true
          results.is_safe = false

          const hasHighSeverity = contentResult.value.content_policy_violations.some(
            (v) => v.severity === 'high'
          )

          if (hasHighSeverity || contentResult.value.recommendation === 'reject') {
            results.overall_risk = 'high'
            results.action = 'block'
          } else if (results.overall_risk === 'low') {
            results.overall_risk = 'medium'
            results.action = 'warn'
          }
        }
      }

      // Process topic control
      if (topicResult.status === 'fulfilled' && topicResult.value) {
        results.details.topics = topicResult.value
        if (!topicResult.value.is_safe) {
          results.topic_violations = true
          if (context?.strictMode) {
            results.is_safe = false
            if (results.overall_risk === 'low') {
              results.overall_risk = 'medium'
              results.action = 'warn'
            }
          }
        }
      }

      logger.debug(
        `Safety check completed: ${results.is_safe ? 'SAFE' : 'UNSAFE'} (${results.overall_risk} risk)`
      )
      return results
    } catch (error) {
      logger.error('Comprehensive safety check failed:', error)
      // Default to safe on error to avoid breaking functionality
      return results
    }
  }

  /**
   * Filter and moderate AI responses
   */
  async moderateAIResponse(response: string): Promise<{
    filtered_response: string
    was_modified: boolean
    violations_found: string[]
  }> {
    const safetyCheck = await this.comprehensiveSafetyCheck(response)

    if (safetyCheck.is_safe) {
      return {
        filtered_response: response,
        was_modified: false,
        violations_found: [],
      }
    }

    // Apply content filtering
    let filteredResponse = response
    const violations: string[] = []

    // Basic content filtering (can be enhanced)
    if (safetyCheck.content_violations && safetyCheck.details.content) {
      for (const violation of safetyCheck.details.content.content_policy_violations) {
        if (violation.severity === 'high') {
          violations.push(violation.policy)
          // Replace with safer content
          filteredResponse =
            'Desculpe, não posso fornecer uma resposta para isso. Posso ajudá-lo com informações sobre música?'
          break
        }
      }
    }

    if (safetyCheck.jailbreak_risk) {
      violations.push('Jailbreak attempt detected')
      filteredResponse =
        'Detectei uma tentativa de contornar minhas diretrizes. Como posso ajudá-lo de forma apropriada?'
    }

    return {
      filtered_response: filteredResponse,
      was_modified: filteredResponse !== response,
      violations_found: violations,
    }
  }

  /**
   * Get music-related allowed topics
   */
  getMusicAllowedTopics(): string[] {
    return [
      'music',
      'songs',
      'artists',
      'albums',
      'playlists',
      'audio',
      'sound',
      'music streaming',
      'music commands',
      'volume control',
      'music queue',
      'music search',
      'music playback',
      'audio filters',
      'music bot help',
      'discord music',
      'entertainment',
      'general conversation',
      'greetings',
      'thanks',
    ]
  }

  /**
   * Check if Guard service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey
  }

  /**
   * Get guard statistics
   */
  getGuardStats(): {
    models: string[]
    features: string[]
    availability: boolean
  } {
    return {
      models: [this.jailbreakModel, this.contentSafetyModel, this.topicControlModel],
      features: ['Jailbreak Detection', 'Content Safety', 'Topic Control'],
      availability: this.isAvailable(),
    }
  }
}
