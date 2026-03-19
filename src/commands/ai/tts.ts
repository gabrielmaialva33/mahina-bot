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
    // Parse arguments
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

    // Validate input
    if (!text) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: '❌ Por favor, forneça um texto para converter em áudio!',
            color: client.config.color.red,
          },
        ],
        flags: MessageFlags.Ephemeral,
      })
    }

    // Get TTS service
    const ttsService = client.services.nvidiaTTS
    if (!ttsService) {
      return await ctx.sendMessage({
        embeds: [
          {
            description:
              '❌ Serviço TTS não está disponível. Configure NVIDIA_API_KEY no ambiente.',
            color: client.config.color.red,
          },
        ],
        flags: MessageFlags.Ephemeral,
      })
    }

    if (!ttsService.isAvailable()) {
      return await ctx.sendMessage({
        embeds: [
          {
            description:
              '❌ Serviço TTS não está configurado. Configure NVIDIA_API_KEY no ambiente.',
            color: client.config.color.red,
          },
        ],
        flags: MessageFlags.Ephemeral,
      })
    }

    // Clean and validate text
    const cleanedText = ttsService.cleanTextForTTS(text)
    const validation = ttsService.validateTextLength(cleanedText)

    if (!validation.valid) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: `❌ ${validation.message}`,
            color: client.config.color.red,
          },
        ],
        flags: MessageFlags.Ephemeral,
      })
    }

    // Show loading message
    const loadingEmbed = new EmbedBuilder()
      .setColor(client.config.color.main)
      .setDescription('🎵 Gerando áudio... Isso pode levar alguns segundos.')
      .addFields(
        {
          name: '📝 Texto',
          value: cleanedText.substring(0, 200) + (cleanedText.length > 200 ? '...' : ''),
          inline: false,
        },
        { name: '🎤 Voz', value: this.getVoiceName(voice), inline: true },
        { name: '⚡ Velocidade', value: `${speed}x`, inline: true },
        {
          name: '🎵 Tom',
          value: pitch === 0 ? 'Normal' : pitch > 0 ? 'Mais alto' : 'Mais baixo',
          inline: true,
        }
      )
      .setFooter({ text: 'NVIDIA TTS • Powered by Magpie Multilingual' })

    const msg = await ctx.sendDeferMessage({ embeds: [loadingEmbed] })

    try {
      // Generate TTS
      const result = await ttsService.textToSpeech(cleanedText, {
        voice,
        language: 'pt-BR',
        speed,
        pitch,
      })

      if (!result || !result.audio_data) {
        return await ctx.editMessage({
          embeds: [
            {
              title: '❌ Erro na geração de áudio',
              description: 'Não foi possível gerar o áudio. Tente novamente mais tarde.',
              color: client.config.color.red,
            },
          ],
        })
      }

      // Create audio attachment
      const attachment = new AttachmentBuilder(result.audio_data, {
        name: 'tts_audio.wav',
        description: 'Áudio gerado pelo NVIDIA TTS',
      })

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor(client.config.color.green)
        .setTitle('🎵 Áudio Gerado com Sucesso!')
        .addFields(
          {
            name: '📝 Texto Original',
            value: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
            inline: false,
          },
          { name: '🎤 Voz Utilizada', value: this.getVoiceName(voice), inline: true },
          { name: '⚡ Velocidade', value: `${speed}x`, inline: true },
          {
            name: '🎵 Tom',
            value: pitch === 0 ? 'Normal' : pitch > 0 ? 'Mais alto' : 'Mais baixo',
            inline: true,
          }
        )
        .setFooter({
          text: `Solicitado por ${ctx.author!.username} • NVIDIA TTS`,
          iconURL: ctx.author!.avatarURL() || undefined,
        })
        .setTimestamp()

      if (result.duration) {
        successEmbed.addFields({
          name: '⏱️ Duração',
          value: `${result.duration.toFixed(1)}s`,
          inline: true,
        })
      }

      // Send response with audio
      await ctx.editMessage({
        embeds: [successEmbed],
        files: [attachment],
      })
    } catch (error) {
      console.error('TTS Generation Error:', error)
      await ctx.editMessage({
        embeds: [
          {
            title: '❌ Erro na geração de áudio',
            description: 'Ocorreu um erro durante a geração do áudio. Tente novamente mais tarde.',
            fields: [
              {
                name: 'Detalhes do erro',
                value: (error as Error).message || 'Erro desconhecido',
                inline: false,
              },
            ],
            color: client.config.color.red,
          },
        ],
      })
    }
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
