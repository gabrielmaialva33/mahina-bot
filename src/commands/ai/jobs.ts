import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js'

export default class JobsCommand extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'aijobs',
      description: {
        content: 'Manage AI background jobs and processing tasks',
        examples: ['aijobs status', 'aijobs queue embedding "Hello world"', 'aijobs stats'],
        usage: 'aijobs <action> [options]',
      },
      category: 'ai',
      aliases: ['jobs', 'aiqueue'],
      cooldown: 3,
      args: false,
      player: undefined,
      permissions: {
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'action',
          description: 'Action to perform',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: '📊 View Status', value: 'status' },
            { name: '📈 Queue Stats', value: 'stats' },
            { name: '➕ Queue Job', value: 'queue' },
            { name: '🔍 Job Details', value: 'details' },
            { name: '❌ Cancel Job', value: 'cancel' },
            { name: '🧹 Clear Queue', value: 'clear' },
          ],
        },
        {
          name: 'job_type',
          description: 'Type of job to queue',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '🔤 Embedding Generation', value: 'embedding' },
            { name: '🔍 Message Analysis', value: 'analysis' },
            { name: '🤖 AI Generation', value: 'generation' },
            { name: '📊 Batch Processing', value: 'batch' },
          ],
        },
        {
          name: 'content',
          description: 'Content for the job',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: 'job_id',
          description: 'Job ID for details/cancel',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: 'priority',
          description: 'Job priority (0-10, higher = more priority)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 0,
          maxValue: 10,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const jobService = client.services.aiJob

    if (!jobService?.isAvailable()) {
      return await ctx.sendMessage({
        embeds: [
          {
            description:
              '❌ AI Job Service is not available. Please contact the bot administrator.',
            color: client.config.color.red,
          },
        ],
      })
    }

    // Parse arguments
    let action: string
    let jobType: string | undefined
    let content: string | undefined
    let jobId: string | undefined
    let priority: number = 0

    if (ctx.isInteraction) {
      action = ctx.options.get('action')?.value as string
      jobType = ctx.options.get('job_type')?.value as string
      content = ctx.options.get('content')?.value as string
      jobId = ctx.options.get('job_id')?.value as string
      priority = (ctx.options.get('priority')?.value as number) || 0
    } else {
      action = args[0]?.toLowerCase() || 'status'
      jobType = args[1]
      content = args.slice(2).join(' ')
    }

    await ctx.sendDeferMessage()

    try {
      switch (action) {
        case 'status':
          await this.showStatus(client, ctx, jobService)
          break

        case 'stats':
          await this.showStats(client, ctx, jobService)
          break

        case 'queue':
          if (!jobType) {
            return await ctx.editMessage({
              embeds: [
                {
                  description: '❌ Please specify a job type to queue!',
                  color: client.config.color.red,
                },
              ],
            })
          }
          await this.queueJob(client, ctx, jobService, jobType, content || '', priority)
          break

        case 'details':
          if (!jobId) {
            return await ctx.editMessage({
              embeds: [
                {
                  description: '❌ Please provide a job ID!',
                  color: client.config.color.red,
                },
              ],
            })
          }
          await this.showJobDetails(client, ctx, jobService, jobId)
          break

        case 'cancel':
          if (!jobId) {
            return await ctx.editMessage({
              embeds: [
                {
                  description: '❌ Please provide a job ID to cancel!',
                  color: client.config.color.red,
                },
              ],
            })
          }
          await this.cancelJob(client, ctx, jobService, jobId)
          break

        case 'clear':
          await this.clearQueue(client, ctx, jobService)
          break

        default:
          await ctx.editMessage({
            embeds: [
              {
                description:
                  '❌ Invalid action! Use: status, stats, queue, details, cancel, or clear',
                color: client.config.color.red,
              },
            ],
          })
      }
    } catch (error) {
      console.error('AI Jobs command error:', error)
      await ctx.editMessage({
        embeds: [
          {
            title: '❌ Error',
            description: 'An error occurred while processing your request.',
            fields: [
              {
                name: 'Error',
                value: (error as Error).message || 'Unknown error',
                inline: false,
              },
            ],
            color: client.config.color.red,
          },
        ],
      })
    }
  }

  private async showStatus(client: MahinaBot, ctx: Context, jobService: any): Promise<void> {
    const stats = await jobService.getQueueStats()

    const embed = new EmbedBuilder()
      .setTitle('🤖 AI Job Queue Status')
      .setColor(client.config.color.main)
      .setTimestamp()

    for (const [queue, data] of Object.entries(stats)) {
      const queueName = queue.replace('ai:', '').charAt(0).toUpperCase() + queue.slice(4)
      embed.addFields({
        name: `${this.getQueueEmoji(queue)} ${queueName}`,
        value: `📥 Pending: **${data.pending}**\n✅ Completed: **${data.completed}**\n❌ Failed: **${data.failed}**`,
        inline: true,
      })
    }

    // Add system metrics from TimescaleDB
    const prisma = await client.db.getPrismaClient()
    const metrics = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as last_hour,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_day
      FROM ai_interactions
      WHERE interaction_type IN ('embedding', 'analysis', 'generation', 'batch')
    `

    if (metrics && metrics[0]) {
      const m = metrics[0] as any
      embed.addFields({
        name: '📊 Processing Metrics',
        value: `Total: **${m.total_jobs}**\nLast Hour: **${m.last_hour}**\nLast 24h: **${m.last_day}**`,
        inline: false,
      })
    }

    await ctx.editMessage({ embeds: [embed] })
  }

  private async showStats(client: MahinaBot, ctx: Context, jobService: any): Promise<void> {
    const prisma = await client.db.getPrismaClient()

    // Get hourly stats from continuous aggregate
    const hourlyStats = await prisma.$queryRaw`
      SELECT 
        hour,
        model_name,
        request_count,
        avg_response_time,
        total_tokens
      FROM ai_metrics_hourly
      WHERE hour > NOW() - INTERVAL '24 hours'
      ORDER BY hour DESC
      LIMIT 24
    `

    // Get model performance
    const modelStats = await prisma.$queryRaw`
      SELECT 
        model_name,
        SUM(request_count) as total_requests,
        AVG(avg_response_time_ms) as avg_response_time,
        SUM(error_count) as total_errors,
        AVG(success_rate) as success_rate
      FROM ai_model_metrics
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY model_name
      ORDER BY total_requests DESC
    `

    const embed = new EmbedBuilder()
      .setTitle('📈 AI Processing Statistics')
      .setColor(client.config.color.blue)
      .setTimestamp()

    // Add hourly trend
    if (hourlyStats && Array.isArray(hourlyStats) && hourlyStats.length > 0) {
      const latestHour = hourlyStats[0] as any
      embed.addFields({
        name: '⏰ Latest Hour',
        value: `Requests: **${latestHour.request_count}**\nAvg Response: **${Math.round(latestHour.avg_response_time)}ms**\nTokens: **${latestHour.total_tokens}**`,
        inline: true,
      })
    }

    // Add model performance
    if (modelStats && Array.isArray(modelStats)) {
      for (const stat of modelStats.slice(0, 3)) {
        const s = stat as any
        embed.addFields({
          name: `🎯 ${s.model_name}`,
          value: `Requests: **${s.total_requests}**\nAvg Time: **${Math.round(s.avg_response_time)}ms**\nSuccess: **${Math.round(s.success_rate * 100)}%**`,
          inline: true,
        })
      }
    }

    // Add cache stats
    const cacheStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_embeddings,
        COUNT(CASE WHEN accessed_at > created_at THEN 1 END) as cache_hits,
        AVG(EXTRACT(EPOCH FROM (accessed_at - created_at))) as avg_cache_age
      FROM embedding_cache
    `

    if (cacheStats && cacheStats[0]) {
      const c = cacheStats[0] as any
      const hitRate =
        c.total_embeddings > 0 ? ((c.cache_hits / c.total_embeddings) * 100).toFixed(1) : 0
      embed.addFields({
        name: '💾 Embedding Cache',
        value: `Total: **${c.total_embeddings}**\nHit Rate: **${hitRate}%**\nAvg Age: **${Math.round(c.avg_cache_age / 3600)}h**`,
        inline: false,
      })
    }

    await ctx.editMessage({ embeds: [embed] })
  }

  private async queueJob(
    client: MahinaBot,
    ctx: Context,
    jobService: any,
    jobType: string,
    content: string,
    priority: number
  ): Promise<void> {
    const userId = ctx.author.id
    const guildId = ctx.guild?.id || 'DM'

    let jobData: any

    switch (jobType) {
      case 'embedding':
        jobData = {
          type: 'embedding',
          userId,
          guildId,
          data: {
            content: content || 'Test embedding generation',
            contentType: 'message',
            metadata: {
              source: 'manual_queue',
              timestamp: new Date().toISOString(),
            },
          },
          priority,
        }
        break

      case 'analysis':
        jobData = {
          type: 'analysis',
          userId,
          guildId,
          data: {
            messages: [content || 'Analyze this message'],
            analysisType: 'comprehensive',
          },
          priority,
        }
        break

      case 'generation':
        jobData = {
          type: 'generation',
          userId,
          guildId,
          data: {
            prompt: content || 'Generate a test response',
            model: 'llama-70b',
            parameters: {
              temperature: 0.7,
              maxTokens: 512,
            },
          },
          priority,
        }
        break

      case 'batch':
        jobData = {
          type: 'batch_processing',
          userId,
          guildId,
          data: {
            items: [
              { type: 'embedding', content: 'Batch item 1' },
              { type: 'analysis', message: 'Batch item 2' },
            ],
          },
          priority,
        }
        break

      default:
        return await ctx.editMessage({
          embeds: [
            {
              description: '❌ Invalid job type!',
              color: client.config.color.red,
            },
          ],
        })
    }

    const jobId = await jobService.queueJob(jobData)

    const embed = new EmbedBuilder()
      .setTitle('✅ Job Queued Successfully')
      .setColor(client.config.color.green)
      .addFields(
        { name: 'Job ID', value: `\`${jobId}\``, inline: true },
        { name: 'Type', value: jobType, inline: true },
        { name: 'Priority', value: priority.toString(), inline: true },
        { name: 'Status', value: '⏳ Pending', inline: true }
      )
      .setTimestamp()

    await ctx.editMessage({ embeds: [embed] })
  }

  private async showJobDetails(
    client: MahinaBot,
    ctx: Context,
    jobService: any,
    jobId: string
  ): Promise<void> {
    const job = await jobService.getJobStatus(jobId)

    if (!job) {
      return await ctx.editMessage({
        embeds: [
          {
            description: '❌ Job not found!',
            color: client.config.color.red,
          },
        ],
      })
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 Job Details: ${jobId}`)
      .setColor(this.getStatusColor(job.state, client))
      .addFields(
        { name: 'State', value: this.getStatusEmoji(job.state) + ' ' + job.state, inline: true },
        { name: 'Type', value: job.name.replace('ai:', ''), inline: true },
        { name: 'Priority', value: job.priority.toString(), inline: true },
        { name: 'Created', value: new Date(job.created_on).toLocaleString(), inline: false },
        {
          name: 'Started',
          value: job.started_on ? new Date(job.started_on).toLocaleString() : 'Not started',
          inline: true,
        },
        {
          name: 'Completed',
          value: job.completed_on ? new Date(job.completed_on).toLocaleString() : 'Not completed',
          inline: true,
        }
      )
      .setTimestamp()

    if (job.output) {
      embed.addFields({
        name: 'Output',
        value: `\`\`\`json\n${JSON.stringify(job.output, null, 2).substring(0, 1000)}\`\`\``,
        inline: false,
      })
    }

    if (job.state === 'failed' && job.output?.message) {
      embed.addFields({
        name: 'Error',
        value: `\`\`\`${job.output.message}\`\`\``,
        inline: false,
      })
    }

    await ctx.editMessage({ embeds: [embed] })
  }

  private async cancelJob(
    client: MahinaBot,
    ctx: Context,
    jobService: any,
    jobId: string
  ): Promise<void> {
    try {
      await jobService.cancelJob(jobId)

      await ctx.editMessage({
        embeds: [
          {
            title: '✅ Job Cancelled',
            description: `Job \`${jobId}\` has been cancelled successfully.`,
            color: client.config.color.green,
          },
        ],
      })
    } catch (error) {
      await ctx.editMessage({
        embeds: [
          {
            title: '❌ Failed to Cancel',
            description: `Could not cancel job \`${jobId}\`. It may have already completed or failed.`,
            color: client.config.color.red,
          },
        ],
      })
    }
  }

  private async clearQueue(client: MahinaBot, ctx: Context, jobService: any): Promise<void> {
    // This is a placeholder - pg-boss doesn't have a direct clear queue method
    // In production, you'd implement this with direct database queries

    await ctx.editMessage({
      embeds: [
        {
          title: '🧹 Clear Queue',
          description: 'Queue clearing is not implemented yet. Please contact an administrator.',
          color: client.config.color.yellow,
        },
      ],
    })
  }

  private getQueueEmoji(queue: string): string {
    const emojis: Record<string, string> = {
      'ai:embedding': '🔤',
      'ai:analysis': '🔍',
      'ai:generation': '🤖',
      'ai:training': '🧠',
      'ai:batch': '📊',
    }
    return emojis[queue] || '📦'
  }

  private getStatusEmoji(state: string): string {
    const emojis: Record<string, string> = {
      created: '🆕',
      retry: '🔄',
      active: '⚡',
      completed: '✅',
      expired: '⏰',
      cancelled: '🚫',
      failed: '❌',
    }
    return emojis[state] || '❓'
  }

  private getStatusColor(state: string, client: MahinaBot): number {
    const colors: Record<string, number> = {
      created: client.config.color.blue,
      retry: client.config.color.yellow,
      active: client.config.color.violet,
      completed: client.config.color.green,
      expired: client.config.color.yellow,
      cancelled: client.config.color.yellow,
      failed: client.config.color.red,
    }
    return colors[state] || client.config.color.main
  }
}
