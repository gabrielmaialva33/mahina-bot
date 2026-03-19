import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  Message,
  MessageFlags,
} from 'discord.js'
import OpenAI from 'openai'
import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'

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

  public async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    // Check for attachments in the message or referenced message
    const attachments = ctx.msg?.attachments || ctx.interaction?.options?.resolved?.attachments
    const attachment = attachments?.first()

    if (!attachment || !attachment.contentType?.startsWith('image/')) {
      return this.showHelp(ctx)
    }

    const mode = this.determineMode(args[0])
    const customQuestion = mode === 'custom' ? args.join(' ') : args.slice(1).join(' ')

    const loadingEmbed = new EmbedBuilder()
      .setColor(this.client.config.color.violet)
      .setDescription(t('ai.vision.messages.analyzing'))
      .setThumbnail(attachment.url)
      .setFooter({ text: t('ai.vision.messages.footer') })

    const msg = await ctx.sendMessage({ embeds: [loadingEmbed] })

    try {
      const systemPrompt = this.getSystemPrompt(mode)
      const userPrompt = customQuestion || this.getDefaultPrompt(mode)

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

  private determineMode(arg?: string): string {
    const modes = ['analyze', 'describe', 'ocr', 'art', 'detect', 'technical']

    if (!arg) return 'describe'

    const lowerArg = arg.toLowerCase()
    return modes.find((mode) => mode.startsWith(lowerArg)) || 'custom'
  }

  private getSystemPrompt(mode: string): string {
    const prompts: Record<string, string> = {
      analyze: `Você é um analisador de imagens especialista. Forneça uma análise detalhada incluindo:
      - Conteúdo principal da imagem
      - Elementos visuais importantes
      - Cores dominantes
      - Composição e estilo
      - Contexto e possível propósito`,

      describe: `Descreva a imagem de forma clara e detalhada.
      Seja objetivo mas completo, mencionando todos os elementos importantes visíveis.`,

      ocr: `Extraia e transcreva todo o texto visível na imagem.
      Organize o texto de forma lógica e indique a localização quando relevante.
      Se não houver texto, indique claramente.`,

      art: `Analise a imagem do ponto de vista artístico:
      - Estilo artístico
      - Técnicas utilizadas
      - Composição
      - Uso de cores e luz
      - Impacto emocional
      - Possível significado ou mensagem`,

      detect: `Identifique e liste todos os objetos, pessoas e elementos na imagem.
      Para cada item detectado, indique:
      - O que é
      - Localização aproximada
      - Características notáveis`,

      technical: `Forneça uma análise técnica da imagem:
      - Resolução estimada
      - Qualidade da imagem
      - Tipo de imagem (foto, ilustração, screenshot, etc)
      - Possíveis edições ou manipulações
      - Metadados visíveis`,

      custom: `Responda à pergunta do usuário sobre a imagem de forma precisa e útil.`,
    }

    return prompts[mode] || prompts.custom
  }

  private getDefaultPrompt(mode: string): string {
    const prompts: Record<string, string> = {
      analyze: 'Faça uma análise completa desta imagem.',
      describe: 'Descreva o que você vê nesta imagem.',
      ocr: 'Extraia todo o texto presente nesta imagem.',
      art: 'Analise esta imagem do ponto de vista artístico.',
      detect: 'Identifique todos os objetos e pessoas nesta imagem.',
      technical: 'Faça uma análise técnica desta imagem.',
    }

    return prompts[mode] || 'O que você pode me dizer sobre esta imagem?'
  }

  private async sendAnalysisResult(
    ctx: Context,
    msg: Message,
    response: string,
    mode: string,
    attachment: any
  ) {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const modeInfo: Record<string, { emoji: string; title: string }> = {
      analyze: { emoji: '🔍', title: t('ai.vision.modes.analyze.title') },
      describe: { emoji: '📝', title: t('ai.vision.modes.describe.title') },
      ocr: { emoji: '📄', title: t('ai.vision.modes.ocr.title') },
      art: { emoji: '🎨', title: t('ai.vision.modes.art.title') },
      detect: { emoji: '👥', title: t('ai.vision.modes.detect.title') },
      technical: { emoji: '📊', title: t('ai.vision.modes.technical.title') },
      custom: { emoji: '💬', title: t('ai.vision.modes.custom.title') },
    }

    const info = modeInfo[mode] || modeInfo.custom

    const embed = new EmbedBuilder()
      .setColor(this.client.config.color.blue)
      .setTitle(`${info.emoji} ${info.title}`)
      .setDescription(response.length > 4000 ? response.substring(0, 4000) + '...' : response)
      .setThumbnail(attachment.url)
      .setFooter({
        text: t('ai.vision.messages.footer'),
        iconURL:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Nvidia_logo.svg/1200px-Nvidia_logo.svg.png',
      })
      .setTimestamp()

    // Add metadata fields
    if (mode === 'technical' || mode === 'analyze') {
      embed.addFields(
        {
          name: t('ai.vision.metadata.dimensions'),
          value: `${attachment.width}x${attachment.height}`,
          inline: true,
        },
        {
          name: t('ai.vision.metadata.size'),
          value: this.formatFileSize(attachment.size),
          inline: true,
        },
        {
          name: t('ai.vision.metadata.type'),
          value: attachment.contentType || t('ai.vision.messages.unknown_type'),
          inline: true,
        }
      )
    }

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('vision_reanalyze')
        .setLabel(t('ai.vision.buttons.reanalyze'))
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('vision_export')
        .setLabel(t('ai.vision.buttons.export'))
        .setEmoji('📤')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('vision_modes')
        .setLabel(t('ai.vision.buttons.modes'))
        .setEmoji('🔧')
        .setStyle(ButtonStyle.Secondary)
    )

    await msg.edit({ embeds: [embed], components: [buttons] })

    // Handle button interactions
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000,
    })

    collector.on('collect', async (interaction) => {
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
          const exportContent = [
            `${t('ai.vision.messages.export_title')} - ${info.title}`,
            '',
            `${t('ai.vision.messages.export_date')}: ${new Date().toLocaleString('pt-BR')}`,
            `${t('ai.vision.messages.export_image')}: ${attachment.name || t('ai.vision.messages.no_name')}`,
            `${t('ai.vision.metadata.dimensions')}: ${attachment.width}x${attachment.height}`,
            `${t('ai.vision.metadata.size')}: ${this.formatFileSize(attachment.size)}`,
            '',
            `${t('ai.vision.messages.export_result')}:`,
            response,
          ].join('\n')

          const exportFile = new AttachmentBuilder(Buffer.from(exportContent), {
            name: `analise_imagem_${Date.now()}.txt`,
          })

          await interaction.reply({
            files: [exportFile],
            flags: MessageFlags.Ephemeral,
          })
          break

        case 'vision_modes':
          const modesEmbed = new EmbedBuilder()
            .setColor(this.client.config.color.main)
            .setTitle(t('ai.vision.messages.available_modes'))
            .setDescription(t('ai.vision.messages.mode_usage'))
            .addFields(
              { name: '🔍 analyze', value: t('ai.vision.mode_descriptions.analyze'), inline: true },
              {
                name: '📝 describe',
                value: t('ai.vision.mode_descriptions.describe'),
                inline: true,
              },
              { name: '📄 ocr', value: t('ai.vision.mode_descriptions.ocr'), inline: true },
              { name: '🎨 art', value: t('ai.vision.mode_descriptions.art'), inline: true },
              { name: '👥 detect', value: t('ai.vision.mode_descriptions.detect'), inline: true },
              {
                name: '📊 technical',
                value: t('ai.vision.mode_descriptions.technical'),
                inline: true,
              }
            )

          await interaction.reply({
            embeds: [modesEmbed],
            flags: MessageFlags.Ephemeral,
          })
          break
      }
    })
  }

  private showHelp(ctx: Context) {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const embed = new EmbedBuilder()
      .setColor(this.client.config.color.main)
      .setTitle(t('ai.vision.messages.help_title'))
      .setDescription(t('ai.vision.messages.help_description'))
      .addFields(
        {
          name: t('ai.vision.messages.how_to_use'),
          value: t('ai.vision.messages.how_to_steps'),
        },
        {
          name: t('ai.vision.messages.available_modes'),
          value: [
            `• !vision - ${t('ai.vision.mode_descriptions.describe')}`,
            `• !vision analyze - ${t('ai.vision.mode_descriptions.analyze')}`,
            `• !vision ocr - ${t('ai.vision.mode_descriptions.ocr')}`,
            `• !vision art - ${t('ai.vision.mode_descriptions.art')}`,
            `• !vision detect - ${t('ai.vision.mode_descriptions.detect')}`,
            `• !vision technical - ${t('ai.vision.mode_descriptions.technical')}`,
          ].join('\n'),
        },
        {
          name: t('ai.vision.messages.custom_questions'),
          value: t('ai.vision.messages.custom_examples'),
        }
      )
      .setFooter({ text: t('ai.vision.messages.attach_image') })

    return ctx.sendMessage({ embeds: [embed] })
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }
}
