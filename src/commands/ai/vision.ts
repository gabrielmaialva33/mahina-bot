import {
  ApplicationCommandOptionType,
  Attachment,
  ButtonInteraction,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  Message,
} from 'discord.js'
import OpenAI from 'openai'
import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
import {
  createVisionButtons,
  createVisionExportAttachment,
  createVisionHelpEmbed,
  createVisionLoadingEmbed,
  createVisionModesEmbed,
  createVisionResultEmbed,
  determineVisionMode,
  getVisionDefaultPrompt,
  getVisionSystemPrompt,
  type VisionMode,
} from '#common/vision_runtime'

export default class VisionCommand extends Command {
  private openai: OpenAI

  constructor(client: MahinaBot) {
    super(client, {
      name: 'vision',
      description: {
        content: 'Análise inteligente de imagens com IA - descreva, analise e extraia informações!',
        examples: ['vision O que tem nesta imagem?', 'vision analyze', 'vision ocr'],
        usage: 'vision [pergunta/modo]',
      },
      category: 'ai',
      aliases: ['image', 'analyze-image', 'img'],
      cooldown: 5,
      args: false,
      player: {
        voice: false,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks', 'AttachFiles'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'mode',
          description: 'Modo de análise',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '🔍 Análise Detalhada', value: 'analyze' },
            { name: '📝 Descrever Imagem', value: 'describe' },
            { name: '📄 Extrair Texto (OCR)', value: 'ocr' },
            { name: '🎨 Análise Artística', value: 'art' },
            { name: '👥 Detectar Pessoas/Objetos', value: 'detect' },
            { name: '📊 Análise Técnica', value: 'technical' },
          ],
        },
        {
          name: 'pergunta',
          description: 'Pergunta específica sobre a imagem',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    })

    this.openai = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    })
  }

  public async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    // Check for attachments in the message or referenced message
    const attachments = ctx.msg?.attachments || ctx.interaction?.options?.resolved?.attachments
    const attachment = attachments?.first()

    if (!attachment || !attachment.contentType?.startsWith('image/')) {
      return this.showHelp(ctx)
    }

    const mode = determineVisionMode(args[0])
    const customQuestion = mode === 'custom' ? args.join(' ') : args.slice(1).join(' ')

    const loadingEmbed = createVisionLoadingEmbed(this.client.config.color.violet, t, attachment)

    const msg = await ctx.sendMessage({ embeds: [loadingEmbed] })

    try {
      const systemPrompt = getVisionSystemPrompt(mode)
      const userPrompt = customQuestion || getVisionDefaultPrompt(mode)

      // For NVIDIA API, we'll analyze the image using text description
      // In a real implementation, you'd use a vision-capable model
      const imageAnalysisPrompt = `Analise esta imagem: ${attachment.url}\n\n${userPrompt}`

      const completion = await this.openai.chat.completions.create({
        model: 'meta/llama-3.1-405b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: imageAnalysisPrompt },
        ],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 2048,
      })

      const response = completion.choices[0]?.message?.content || t('ai.vision.errors.no_result')

      await this.sendAnalysisResult(ctx, msg, response, mode, attachment)
    } catch (error) {
      console.error('Vision analysis error:', error)

      const errorEmbed = new EmbedBuilder()
        .setColor(this.client.config.color.red)
        .setTitle('❌')
        .setDescription(t('ai.vision.errors.analysis_failed'))

      await msg.edit({ embeds: [errorEmbed] })
    }
  }

  private async sendAnalysisResult(
    ctx: Context,
    msg: Message,
    response: string,
    mode: VisionMode,
    attachment: Attachment
  ): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const embed = createVisionResultEmbed(
      this.client.config.color.blue,
      t,
      response,
      mode,
      attachment
    )
    const buttons = createVisionButtons(t)

    await msg.edit({ embeds: [embed], components: [buttons] })

    // Handle button interactions
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000,
    })

    collector.on('collect', async (interaction: ButtonInteraction) => {
      if (interaction.user.id !== ctx.author?.id) {
        return interaction.reply({
          content: t('ai.vision.errors.author_only_buttons'),
          flags: MessageFlags.Ephemeral,
        })
      }

      switch (interaction.customId) {
        case 'vision_reanalyze':
          await interaction.deferUpdate()
          await this.run(this.client, ctx, [])
          break

        case 'vision_export':
          await interaction.reply({
            files: [createVisionExportAttachment(t, mode, attachment, response)],
            flags: MessageFlags.Ephemeral,
          })
          break

        case 'vision_modes':
          await interaction.reply({
            embeds: [createVisionModesEmbed(this.client.config.color.main, t)],
            flags: MessageFlags.Ephemeral,
          })
          break
      }
    })
  }

  private showHelp(ctx: Context): Promise<Message> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    return ctx.sendMessage({
      embeds: [createVisionHelpEmbed(this.client.config.color.main, t)],
    })
  }
}
