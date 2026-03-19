import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
import {
  ApplicationCommandOptionType,
  AttachmentBuilder,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js'

export default class TTSCommand extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'tts',
      description: {
        content: 'Converte texto em áudio usando NVIDIA TTS',
        examples: [
          'tts Olá! Como você está?',
          'tts voice:portuguese_female_1 Bem-vindo ao servidor!',
        ],
        usage: 'tts <texto> [voice:nome_da_voz] [speed:velocidade]',
      },
      category: 'ai',
      aliases: ['falar', 'voice', 'audio'],
      cooldown: 10,
      args: true,
      vote: false,
      player: undefined,
      permissions: {
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks', 'AttachFiles'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'texto',
          description: 'O texto que será convertido em áudio',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'voz',
          description: 'Escolha da voz para o TTS',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '🇧🇷 Feminina Brasileira', value: 'portuguese_female_1' },
            { name: '🇧🇷 Masculina Brasileira', value: 'portuguese_male_1' },
            { name: '🌍 Feminina Multilíngue 1', value: 'multilingual_female_1' },
            { name: '🌍 Feminina Multilíngue 2', value: 'multilingual_female_2' },
            { name: '🌍 Masculina Multilíngue 1', value: 'multilingual_male_1' },
            { name: '🌍 Masculina Multilíngue 2', value: 'multilingual_male_2' },
            { name: '🇺🇸 Feminina Inglês', value: 'english_female_1' },
            { name: '🇺🇸 Masculina Inglês', value: 'english_male_1' },
          ],
        },
        {
          name: 'velocidade',
          description: 'Velocidade da fala (0.5 - 2.0)',
          type: ApplicationCommandOptionType.Number,
          required: false,
          min_value: 0.5,
          max_value: 2.0,
        },
        {
          name: 'tom',
          description: 'Tom da voz (-0.5 a 0.5)',
          type: ApplicationCommandOptionType.Number,
          required: false,
          min_value: -0.5,
          max_value: 0.5,
        },
        {
          name: 'privado',
          description: 'Enviar áudio apenas para você',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    let text: string
    let voice: string
    let speed: number
    let pitch: number
    let ephemeral: boolean

    if (ctx.isInteraction) {
      text = ctx.options.get('texto')?.value as string
      voice = (ctx.options.get('voz')?.value as string) || 'multilingual_female_1'
      speed = (ctx.options.get('velocidade')?.value as number) || 1.0
      pitch = (ctx.options.get('tom')?.value as number) || 0.0
      ephemeral = (ctx.options.get('privado')?.value as boolean) || false
    } else {
      text = args.join(' ')
      voice = 'multilingual_female_1'
      speed = 1.0
      pitch = 0.0
      ephemeral = false
    }

    if (!text) {
      return await ctx.sendMessage({
        embeds: [
          this.createEmbed(
            client,
            ctx,
            'red',
            'cmd.tts.ui.errors.missing_text.title',
            'cmd.tts.ui.errors.missing_text.description'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      })
    }

    const ttsService = client.services.nvidiaTTS
    if (!ttsService) {
      return await ctx.sendMessage({
        embeds: [
          this.createEmbed(
            client,
            ctx,
            'red',
            'cmd.tts.ui.errors.unavailable.title',
            'cmd.tts.ui.errors.unavailable.description'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      })
    }

    if (!ttsService.isAvailable()) {
      return await ctx.sendMessage({
        embeds: [
          this.createEmbed(
            client,
            ctx,
            'red',
            'cmd.tts.ui.errors.not_configured.title',
            'cmd.tts.ui.errors.not_configured.description'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      })
    }

    const cleanedText = ttsService.cleanTextForTTS(text)
    const validation = ttsService.validateTextLength(cleanedText)

    if (!validation.valid) {
      return await ctx.sendMessage({
        embeds: [
          new EmbedBuilder()
            .setColor(client.config.color.red)
            .setTitle(ctx.locale('cmd.tts.ui.errors.invalid_text.title'))
            .setDescription(validation.message),
        ],
        flags: MessageFlags.Ephemeral,
      })
    }

    const loadingEmbed = new EmbedBuilder()
      .setColor(client.config.color.main)
      .setTitle(ctx.locale('cmd.tts.ui.loading.title'))
      .setDescription(ctx.locale('cmd.tts.ui.loading.description'))
      .addFields(
        {
          name: ctx.locale('cmd.tts.ui.fields.text'),
          value: cleanedText.substring(0, 200) + (cleanedText.length > 200 ? '...' : ''),
          inline: false,
        },
        {
          name: ctx.locale('cmd.tts.ui.fields.voice'),
          value: this.getVoiceName(voice),
          inline: true,
        },
        { name: ctx.locale('cmd.tts.ui.fields.speed'), value: `${speed}x`, inline: true },
        {
          name: ctx.locale('cmd.tts.ui.fields.pitch'),
          value:
            pitch === 0
              ? ctx.locale('cmd.tts.ui.values.pitch.normal')
              : pitch > 0
                ? ctx.locale('cmd.tts.ui.values.pitch.higher')
                : ctx.locale('cmd.tts.ui.values.pitch.lower'),
          inline: true,
        }
      )
      .setFooter({ text: ctx.locale('cmd.tts.ui.loading.footer') })

    const msg = await ctx.sendDeferMessage({ embeds: [loadingEmbed] })

    try {
      const result = await ttsService.textToSpeech(cleanedText, {
        voice,
        language: 'pt-BR',
        speed,
        pitch,
      })

      if (!result || !result.audio_data) {
        return await ctx.editMessage({
          embeds: [
            this.createEmbed(
              client,
              ctx,
              'red',
              'cmd.tts.ui.errors.generation_failed.title',
              'cmd.tts.ui.errors.generation_failed.description'
            ),
          ],
        })
      }

      const attachment = new AttachmentBuilder(result.audio_data, {
        name: 'tts_audio.wav',
        description: 'Áudio gerado pelo NVIDIA TTS',
      })

      const successEmbed = new EmbedBuilder()
        .setColor(client.config.color.green)
        .setTitle(ctx.locale('cmd.tts.ui.success.title'))
        .addFields(
          {
            name: ctx.locale('cmd.tts.ui.fields.original_text'),
            value: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
            inline: false,
          },
          {
            name: ctx.locale('cmd.tts.ui.fields.voice_used'),
            value: this.getVoiceName(voice),
            inline: true,
          },
          { name: ctx.locale('cmd.tts.ui.fields.speed'), value: `${speed}x`, inline: true },
          {
            name: ctx.locale('cmd.tts.ui.fields.pitch'),
            value:
              pitch === 0
                ? ctx.locale('cmd.tts.ui.values.pitch.normal')
                : pitch > 0
                  ? ctx.locale('cmd.tts.ui.values.pitch.higher')
                  : ctx.locale('cmd.tts.ui.values.pitch.lower'),
            inline: true,
          }
        )
        .setFooter({
          text: ctx.locale('cmd.tts.ui.success.footer', { user: ctx.author!.username }),
          iconURL: ctx.author!.avatarURL() || undefined,
        })
        .setTimestamp()

      if (result.duration) {
        successEmbed.addFields({
          name: ctx.locale('cmd.tts.ui.fields.duration'),
          value: `${result.duration.toFixed(1)}s`,
          inline: true,
        })
      }

      await ctx.editMessage({
        embeds: [successEmbed],
        files: [attachment],
      })
    } catch (error) {
      client.logger.error('TTS generation error:', error)
      await ctx.editMessage({
        embeds: [
          new EmbedBuilder()
            .setColor(client.config.color.red)
            .setTitle(ctx.locale('cmd.tts.ui.errors.runtime.title'))
            .setDescription(ctx.locale('cmd.tts.ui.errors.runtime.description'))
            .addFields({
              name: ctx.locale('cmd.tts.ui.errors.runtime.field'),
              value: (error as Error).message || ctx.locale('cmd.tts.ui.errors.runtime.unknown'),
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

  private getVoiceName(voiceId: string): string {
    const voiceNames: Record<string, string> = {
      portuguese_female_1: '🇧🇷 Feminina Brasileira',
      portuguese_male_1: '🇧🇷 Masculina Brasileira',
      multilingual_female_1: '🌍 Feminina Multilíngue 1',
      multilingual_female_2: '🌍 Feminina Multilíngue 2',
      multilingual_male_1: '🌍 Masculina Multilíngue 1',
      multilingual_male_2: '🌍 Masculina Multilíngue 2',
      english_female_1: '🇺🇸 Feminina Inglês',
      english_male_1: '🇺🇸 Masculina Inglês',
    }
    return voiceNames[voiceId] || voiceId
  }
}
