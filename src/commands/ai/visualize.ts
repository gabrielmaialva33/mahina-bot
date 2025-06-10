import { Command, type Context, type MahinaBot } from '#common/index'
import Discord, { ApplicationCommandOptionType, AttachmentBuilder, EmbedBuilder } from 'discord.js'

const { InteractionResponseFlags } = Discord

export default class VisualizeCommand extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'visualize',
      description: {
        content: 'Gera visualizações com física realista usando NVIDIA Cosmos',
        examples: ['visualize música atual', 'visualize dancing lights', 'visualize ocean waves'],
        usage: 'visualize <prompt> [style] [frames]',
      },
      category: 'ai',
      aliases: ['cosmos', 'genvideo', 'physics'],
      cooldown: 30,
      args: false,
      vote: false,
      player: false,
      inVoice: false,
      sameVoice: false,
      permissions: {
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks', 'AttachFiles'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'tipo',
          description: 'Tipo de visualização',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: '🎵 Música Atual', value: 'nowplaying' },
            { name: '🎨 Prompt Customizado', value: 'custom' },
            { name: '🌊 Predição Física', value: 'physics' },
          ],
        },
        {
          name: 'prompt',
          description: 'Descrição da visualização (obrigatório para prompt customizado)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: 'estilo',
          description: 'Estilo visual da animação',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '🎭 Abstrato', value: 'abstract' },
            { name: '🎬 Realista', value: 'realistic' },
            { name: '🌃 Cyberpunk', value: 'cyberpunk' },
            { name: '💫 Neon', value: 'neon' },
            { name: '⭕ Minimalista', value: 'minimalist' },
          ],
        },
        {
          name: 'frames',
          description: 'Número de frames (8-48, padrão: 16)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 8,
          max_value: 48,
        },
        {
          name: 'incluir_texto',
          description: 'Incluir texto na visualização',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
        {
          name: 'imagem',
          description: 'Imagem base para predição física (opcional)',
          type: ApplicationCommandOptionType.Attachment,
          required: false,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    // Parse arguments
    const type = ctx.interaction?.options.getString('tipo') || 'custom'
    const prompt = ctx.interaction?.options.getString('prompt') || args.join(' ')
    const style = ctx.interaction?.options.getString('estilo') || 'abstract'
    const frames = ctx.interaction?.options.getInteger('frames') || 16
    const includeText = ctx.interaction?.options.getBoolean('incluir_texto') || false
    const imageAttachment = ctx.interaction?.options.getAttachment('imagem')

    // Validate input based on type
    if (type === 'custom' && !prompt) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: '❌ Para visualização customizada, você deve fornecer um prompt!',
            color: client.config.color.red,
          },
        ],
        flags: InteractionResponseFlags.Ephemeral,
      })
    }

    if (type === 'nowplaying' && ctx.guild) {
      const player = client.manager.getPlayer(ctx.guild.id)
      if (!player?.playing || !player.queue.current) {
        return await ctx.sendMessage({
          embeds: [
            {
              description: '❌ Não há música tocando no momento para visualizar!',
              color: client.config.color.red,
            },
          ],
          flags: InteractionResponseFlags.Ephemeral,
        })
      }
    }

    // Get Cosmos service
    const cosmosService = client.services.nvidiaCosmos
    if (!cosmosService) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: '❌ Serviço de visualização não está disponível.',
            color: client.config.color.red,
          },
        ],
        flags: InteractionResponseFlags.Ephemeral,
      })
    }

    if (!cosmosService.isAvailable()) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: '❌ Serviço Cosmos não está configurado. Configure NVIDIA_API_KEY.',
            color: client.config.color.red,
          },
        ],
        flags: InteractionResponseFlags.Ephemeral,
      })
    }

    // Process image attachment if provided
    let imageBuffer: Buffer | undefined
    if (imageAttachment) {
      try {
        const response = await fetch(imageAttachment.url)
        imageBuffer = Buffer.from(await response.arrayBuffer())
      } catch (error) {
        return await ctx.sendMessage({
          embeds: [
            {
              description: '❌ Erro ao processar a imagem anexada.',
              color: client.config.color.red,
            },
          ],
          flags: InteractionResponseFlags.Ephemeral,
        })
      }
    }

    // Show loading message
    const loadingEmbed = new EmbedBuilder()
      .setColor(client.config.color.main)
      .setDescription(
        '🎬 Gerando visualização com física realista... Isso pode levar alguns minutos.'
      )
      .addFields(
        { name: '🎯 Tipo', value: this.getTypeName(type), inline: true },
        { name: '🎨 Estilo', value: this.getStyleName(style), inline: true },
        { name: '🎞️ Frames', value: `${frames} frames`, inline: true }
      )
      .setFooter({ text: 'NVIDIA Cosmos • Physics-Aware AI' })

    if (type === 'custom' && prompt) {
      loadingEmbed.addFields({ name: '📝 Prompt', value: prompt.substring(0, 200), inline: false })
    }

    await ctx.sendDeferMessage({ embeds: [loadingEmbed] })

    try {
      let result = null

      switch (type) {
        case 'nowplaying':
          if (ctx.guild) {
            result = await cosmosService.createNowPlayingVisualization(ctx.guild.id, {
              style: style as any,
              includeText,
            })
          }
          break

        case 'custom':
          result = await cosmosService.generateVideo(prompt, {
            image: imageBuffer,
            numFrames: frames,
            width: 768,
            height: 768,
          })
          break

        case 'physics':
          if (imageBuffer) {
            result = await cosmosService.predictWorldState(imageBuffer, prompt, {
              numFrames: frames,
            })
          } else {
            return await ctx.editMessage({
              embeds: [
                {
                  description: '❌ Predição física requer uma imagem base!',
                  color: client.config.color.red,
                },
              ],
            })
          }
          break
      }

      if (!result || (!result.video_data && !result.video_url)) {
        return await ctx.editMessage({
          embeds: [
            {
              title: '❌ Erro na geração',
              description: 'Não foi possível gerar a visualização. Tente novamente mais tarde.',
              color: client.config.color.red,
            },
          ],
        })
      }

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor(client.config.color.green)
        .setTitle('🎬 Visualização Gerada com Sucesso!')
        .addFields(
          { name: '🎯 Tipo', value: this.getTypeName(type), inline: true },
          { name: '🎨 Estilo', value: this.getStyleName(style), inline: true },
          { name: '🎞️ Frames', value: `${frames} frames`, inline: true }
        )
        .setFooter({
          text: `Solicitado por ${ctx.author.username} • NVIDIA Cosmos`,
          iconURL: ctx.author.avatarURL() || undefined,
        })
        .setTimestamp()

      // Add metadata if available
      if (result.metadata) {
        successEmbed.addFields(
          { name: '⏱️ Duração', value: `${result.metadata.duration.toFixed(1)}s`, inline: true },
          {
            name: '📺 Resolução',
            value: `${result.metadata.width}x${result.metadata.height}`,
            inline: true,
          },
          { name: '🎥 FPS', value: `${result.metadata.fps}`, inline: true }
        )
      }

      // Handle video data
      let videoAttachment: AttachmentBuilder | undefined

      if (result.video_data) {
        const videoBuffer = Buffer.from(result.video_data, 'base64')
        videoAttachment = new AttachmentBuilder(videoBuffer, {
          name: 'cosmos_visualization.mp4',
          description: `Visualização gerada pelo NVIDIA Cosmos (${type})`,
        })
      }

      // Send response
      const messageOptions: any = {
        embeds: [successEmbed],
      }

      if (videoAttachment) {
        messageOptions.files = [videoAttachment]
      } else if (result.video_url) {
        successEmbed.addFields({
          name: '🔗 Video URL',
          value: `[Clique aqui para baixar](${result.video_url})`,
          inline: false,
        })
      }

      // Add now playing info if applicable
      if (type === 'nowplaying' && ctx.guild) {
        const player = client.manager.getPlayer(ctx.guild.id)
        if (player?.queue.current) {
          successEmbed.addFields({
            name: '🎵 Música Visualizada',
            value: `**${player.queue.current.info.title}**\n${player.queue.current.info.author}`,
            inline: false,
          })
        }
      }

      await ctx.editMessage(messageOptions)
    } catch (error) {
      console.error('Cosmos Generation Error:', error)
      await ctx.editMessage({
        embeds: [
          {
            title: '❌ Erro na geração',
            description: 'Ocorreu um erro durante a geração da visualização.',
            fields: [
              {
                name: 'Detalhes do erro',
                value: error.message || 'Erro desconhecido',
                inline: false,
              },
            ],
            color: client.config.color.red,
          },
        ],
      })
    }
  }

  private getTypeName(type: string): string {
    const names = {
      nowplaying: '🎵 Música Atual',
      custom: '🎨 Prompt Customizado',
      physics: '🌊 Predição Física',
    }
    return names[type] || type
  }

  private getStyleName(style: string): string {
    const names = {
      abstract: '🎭 Abstrato',
      realistic: '🎬 Realista',
      cyberpunk: '🌃 Cyberpunk',
      neon: '💫 Neon',
      minimalist: '⭕ Minimalista',
    }
    return names[style] || style
  }
}
