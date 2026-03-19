import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
import {
  ApplicationCommandOptionType,
  Attachment,
  AttachmentBuilder,
  EmbedBuilder,
  MessageFlags,
  type MessageEditOptions,
} from 'discord.js'

type VisualizationType = 'nowplaying' | 'custom' | 'physics'
type VisualizationStyle = 'abstract' | 'realistic' | 'cyberpunk' | 'neon' | 'minimalist'
type CosmosResult = NonNullable<
  Awaited<ReturnType<NonNullable<MahinaBot['services']['nvidiaCosmos']>['generateVideo']>>
>

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
      player: undefined,
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

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    let type: VisualizationType
    let prompt: string
    let style: VisualizationStyle
    let frames: number
    let includeText: boolean
    let imageAttachment: Attachment | undefined

    if (ctx.isInteraction) {
      type = (ctx.options.get('tipo')?.value as VisualizationType) || 'custom'
      prompt = (ctx.options.get('prompt')?.value as string) || ''
      style = (ctx.options.get('estilo')?.value as VisualizationStyle) || 'abstract'
      frames = (ctx.options.get('frames')?.value as number) || 16
      includeText = (ctx.options.get('incluir_texto')?.value as boolean) || false
      imageAttachment = ctx.options.get('imagem')?.attachment
    } else {
      type = 'custom'
      prompt = args.join(' ')
      style = 'abstract'
      frames = 16
      includeText = false
      imageAttachment = undefined
    }

    if (type === 'custom' && !prompt) {
      return await ctx.sendMessage({
        embeds: [
          this.createEmbed(
            client,
            ctx,
            'red',
            'cmd.visualize.ui.errors.missing_prompt.title',
            'cmd.visualize.ui.errors.missing_prompt.description'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      })
    }

    if (type === 'nowplaying' && ctx.guild) {
      const player = client.manager.getPlayer(ctx.guild.id)
      if (!player?.playing || !player.queue.current) {
        return await ctx.sendMessage({
          embeds: [
            this.createEmbed(
              client,
              ctx,
              'red',
              'cmd.visualize.ui.errors.no_music.title',
              'cmd.visualize.ui.errors.no_music.description'
            ),
          ],
          flags: MessageFlags.Ephemeral,
        })
      }
    }

    const cosmosService = client.services.nvidiaCosmos
    if (!cosmosService) {
      return await ctx.sendMessage({
        embeds: [
          this.createEmbed(
            client,
            ctx,
            'red',
            'cmd.visualize.ui.errors.unavailable.title',
            'cmd.visualize.ui.errors.unavailable.description'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      })
    }

    if (!cosmosService.isAvailable()) {
      return await ctx.sendMessage({
        embeds: [
          this.createEmbed(
            client,
            ctx,
            'red',
            'cmd.visualize.ui.errors.not_configured.title',
            'cmd.visualize.ui.errors.not_configured.description'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      })
    }

    let imageBuffer: Buffer | undefined
    if (imageAttachment) {
      try {
        const response = await fetch(imageAttachment.url)
        imageBuffer = Buffer.from(await response.arrayBuffer())
      } catch (error) {
        return await ctx.sendMessage({
          embeds: [
            this.createEmbed(
              client,
              ctx,
              'red',
              'cmd.visualize.ui.errors.invalid_image.title',
              'cmd.visualize.ui.errors.invalid_image.description'
            ),
          ],
          flags: MessageFlags.Ephemeral,
        })
      }
    }

    const loadingEmbed = new EmbedBuilder()
      .setColor(client.config.color.main)
      .setTitle(ctx.locale('cmd.visualize.ui.loading.title'))
      .setDescription(ctx.locale('cmd.visualize.ui.loading.description'))
      .addFields(
        {
          name: ctx.locale('cmd.visualize.ui.fields.type'),
          value: this.getTypeName(type),
          inline: true,
        },
        {
          name: ctx.locale('cmd.visualize.ui.fields.style'),
          value: this.getStyleName(style),
          inline: true,
        },
        {
          name: ctx.locale('cmd.visualize.ui.fields.frames'),
          value: `${frames} frames`,
          inline: true,
        }
      )
      .setFooter({ text: ctx.locale('cmd.visualize.ui.loading.footer') })

    if (type === 'custom' && prompt) {
      loadingEmbed.addFields({
        name: ctx.locale('cmd.visualize.ui.fields.prompt'),
        value: prompt.substring(0, 200),
        inline: false,
      })
    }

    await ctx.sendDeferMessage({ embeds: [loadingEmbed] })

    try {
      let result: CosmosResult | null = null

      switch (type) {
        case 'nowplaying':
          if (ctx.guild) {
            result = await cosmosService.createNowPlayingVisualization(ctx.guild.id, {
              style,
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

      const successEmbed = new EmbedBuilder()
        .setColor(client.config.color.green)
        .setTitle(ctx.locale('cmd.visualize.ui.success.title'))
        .addFields(
          {
            name: ctx.locale('cmd.visualize.ui.fields.type'),
            value: this.getTypeName(type),
            inline: true,
          },
          {
            name: ctx.locale('cmd.visualize.ui.fields.style'),
            value: this.getStyleName(style),
            inline: true,
          },
          {
            name: ctx.locale('cmd.visualize.ui.fields.frames'),
            value: `${frames} frames`,
            inline: true,
          }
        )
        .setFooter({
          text: ctx.locale('cmd.visualize.ui.success.footer', { user: ctx.author!.username }),
          iconURL: ctx.author!.avatarURL() || undefined,
        })
        .setTimestamp()

      if (result.metadata) {
        successEmbed.addFields(
          {
            name: ctx.locale('cmd.visualize.ui.fields.duration'),
            value: `${result.metadata.duration.toFixed(1)}s`,
            inline: true,
          },
          {
            name: ctx.locale('cmd.visualize.ui.fields.resolution'),
            value: `${result.metadata.width}x${result.metadata.height}`,
            inline: true,
          },
          {
            name: ctx.locale('cmd.visualize.ui.fields.fps'),
            value: `${result.metadata.fps}`,
            inline: true,
          }
        )
      }

      let videoAttachment: AttachmentBuilder | undefined

      if (result.video_data) {
        const videoBuffer = Buffer.from(result.video_data, 'base64')
        videoAttachment = new AttachmentBuilder(videoBuffer, {
          name: 'cosmos_visualization.mp4',
          description: `Visualização gerada pelo NVIDIA Cosmos (${type})`,
        })
      }

      const messageOptions: MessageEditOptions = {
        embeds: [successEmbed],
      }

      if (videoAttachment) {
        messageOptions.files = [videoAttachment]
      } else if (result.video_url) {
        successEmbed.addFields({
          name: ctx.locale('cmd.visualize.ui.fields.download'),
          value: ctx.locale('cmd.visualize.ui.success.download', { url: result.video_url }),
          inline: false,
        })
      }

      if (type === 'nowplaying' && ctx.guild) {
        const player = client.manager.getPlayer(ctx.guild.id)
        if (player?.queue.current) {
          successEmbed.addFields({
            name: ctx.locale('cmd.visualize.ui.fields.track'),
            value: `${player.queue.current.info.title}\n${player.queue.current.info.author}`,
            inline: false,
          })
        }
      }

      await ctx.editMessage(messageOptions)
    } catch (error) {
      client.logger.error('Cosmos generation error:', error)
      await ctx.editMessage({
        embeds: [
          new EmbedBuilder()
            .setColor(client.config.color.red)
            .setTitle(ctx.locale('cmd.visualize.ui.errors.runtime.title'))
            .setDescription(ctx.locale('cmd.visualize.ui.errors.runtime.description'))
            .addFields({
              name: ctx.locale('cmd.visualize.ui.errors.runtime.field'),
              value:
                (error as Error).message || ctx.locale('cmd.visualize.ui.errors.runtime.unknown'),
              inline: false,
            }),
        ],
      })
    }
  }

  private createEmbed(
    client: MahinaBot,
    ctx: Context,
    color: 'red' | 'green' | 'main',
    titleKey: string,
    descriptionKey: string
  ): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(client.config.color[color])
      .setTitle(ctx.locale(titleKey))
      .setDescription(ctx.locale(descriptionKey))
  }

  private getTypeName(type: string): string {
    const names: Record<string, string> = {
      nowplaying: '🎵 Música Atual',
      custom: '🎨 Prompt Customizado',
      physics: '🌊 Predição Física',
    }
    return names[type] || type
  }

  private getStyleName(style: string): string {
    const names: Record<string, string> = {
      abstract: '🎭 Abstrato',
      realistic: '🎬 Realista',
      cyberpunk: '🌃 Cyberpunk',
      neon: '💫 Neon',
      minimalist: '⭕ Minimalista',
    }
    return names[style] || style
  }
}
