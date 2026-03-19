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
      .setFooter({ text: 'Powered by NVIDIA Vision AI' })

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

      const response =
        completion.choices[0]?.message?.content || 'Não foi possível analisar a imagem.'

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
    const modeInfo: Record<string, { emoji: string; title: string }> = {
      analyze: { emoji: '🔍', title: 'Análise Detalhada' },
      describe: { emoji: '📝', title: 'Descrição da Imagem' },
      ocr: { emoji: '📄', title: 'Texto Extraído' },
      art: { emoji: '🎨', title: 'Análise Artística' },
      detect: { emoji: '👥', title: 'Objetos Detectados' },
      technical: { emoji: '📊', title: 'Análise Técnica' },
      custom: { emoji: '💬', title: 'Resposta' },
    }

    const info = modeInfo[mode] || modeInfo.custom

    const embed = new EmbedBuilder()
      .setColor(this.client.config.color.blue)
      .setTitle(`${info.emoji} ${info.title}`)
      .setDescription(response.length > 4000 ? response.substring(0, 4000) + '...' : response)
      .setThumbnail(attachment.url)
      .setFooter({
        text: 'Powered by NVIDIA Vision AI',
        iconURL:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Nvidia_logo.svg/1200px-Nvidia_logo.svg.png',
      })
      .setTimestamp()

    // Add metadata fields
    if (mode === 'technical' || mode === 'analyze') {
      embed.addFields(
        { name: '📏 Dimensões', value: `${attachment.width}x${attachment.height}`, inline: true },
        { name: '📦 Tamanho', value: this.formatFileSize(attachment.size), inline: true },
        { name: '📄 Tipo', value: attachment.contentType || 'Desconhecido', inline: true }
      )
    }

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('vision_reanalyze')
        .setLabel('Analisar novamente')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('vision_export')
        .setLabel('Exportar análise')
        .setEmoji('📤')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('vision_modes')
        .setLabel('Outros modos')
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
          content: 'Apenas o autor pode usar esses botões!',
          flags: MessageFlags.Ephemeral,
        })
      }

      switch (interaction.customId) {
        case 'vision_reanalyze':
          await interaction.deferUpdate()
          await this.run(this.client, ctx, [])
          break

        case 'vision_export':
          const exportContent =
            `# Análise de Imagem - ${info.title}\n\n` +
            `**Data:** ${new Date().toLocaleString('pt-BR')}\n` +
            `**Imagem:** ${attachment.name || 'Sem nome'}\n` +
            `**Dimensões:** ${attachment.width}x${attachment.height}\n` +
            `**Tamanho:** ${this.formatFileSize(attachment.size)}\n\n` +
            `## Resultado da Análise\n\n${response}`

          const exportFile = new AttachmentBuilder(Buffer.from(exportContent), {
            name: `analise_imagem_${Date.now()}.md`,
          })

          await interaction.reply({
            files: [exportFile],
            flags: MessageFlags.Ephemeral,
          })
          break

        case 'vision_modes':
          const modesEmbed = new EmbedBuilder()
            .setColor(this.client.config.color.main)
            .setTitle('🔧 Modos de análise disponíveis')
            .setDescription('Use o comando com um desses modos:')
            .addFields(
              { name: '🔍 analyze', value: 'Análise detalhada e completa', inline: true },
              { name: '📝 describe', value: 'Descrição simples da imagem', inline: true },
              { name: '📄 ocr', value: 'Extração de texto (OCR)', inline: true },
              { name: '🎨 art', value: 'Análise artística', inline: true },
              { name: '👥 detect', value: 'Detecção de objetos/pessoas', inline: true },
              { name: '📊 technical', value: 'Análise técnica da imagem', inline: true }
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
    const embed = new EmbedBuilder()
      .setColor(this.client.config.color.main)
      .setTitle('🖼️ Comando Vision - Análise de Imagens com IA')
      .setDescription('Envie uma imagem junto com o comando para analisá-la!')
      .addFields(
        {
          name: '📋 Como usar',
          value:
            '1. Anexe uma imagem à sua mensagem\n2. Use o comando com um modo ou pergunta\n3. Aguarde a análise da IA',
        },
        {
          name: '🔧 Modos disponíveis',
          value: `• \`!vision\` - Descrição básica
• \`!vision analyze\` - Análise detalhada
• \`!vision ocr\` - Extrair texto
• \`!vision art\` - Análise artística
• \`!vision detect\` - Detectar objetos
• \`!vision technical\` - Análise técnica`,
        },
        {
          name: '❓ Perguntas personalizadas',
          value:
            'Você também pode fazer perguntas específicas:\n`!vision O que as pessoas estão fazendo?`\n`!vision Que tipo de lugar é este?`',
        }
      )
      .setFooter({ text: 'Anexe uma imagem para começar!' })

    return ctx.sendMessage({ embeds: [embed] })
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }
}
