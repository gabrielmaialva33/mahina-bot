import type { VoiceChannel } from 'discord.js'
import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'
import { getMemberVoiceChannel } from '#common/player_runtime'

export default class Join extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'join',
      description: {
        content: 'cmd.join.description',
        examples: ['join'],
        usage: 'join',
      },
      category: 'music',
      aliases: ['come', 'j'],
      cooldown: 3,
      args: false,
      vote: false,
      player: {
        voice: true,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: [
          'SendMessages',
          'ReadMessageHistory',
          'ViewChannel',
          'EmbedLinks',
          'Connect',
          'Speak',
        ],
        user: [],
      },
      slashCommand: true,
      options: [],
    })
  }

  async run(client: MahinaBot, ctx: Context): Promise<void> {
    const embed = this.client.embed()
    let player = client.manager.getPlayer(ctx.guild!.id)

    if (player) {
      return await ctx.sendMessage({
        embeds: [
          embed.setColor(this.client.color.main).setDescription(
            ctx.locale('cmd.join.already_connected', {
              channelId: player.voiceChannelId,
            })
          ),
        ],
      })
    }

    const memberVoiceChannel = getMemberVoiceChannel(ctx.member)
    if (!memberVoiceChannel) {
      return await ctx.sendMessage({
        embeds: [
          embed
            .setColor(this.client.color.red)
            .setDescription(ctx.locale('cmd.join.no_voice_channel')),
        ],
      })
    }

    player = client.manager.createPlayer({
      guildId: ctx.guild!.id,
      voiceChannelId: memberVoiceChannel.id,
      textChannelId: ctx.channel.id,
      selfMute: false,
      selfDeaf: true,
      vcRegion: memberVoiceChannel.rtcRegion!,
    })
    if (!player.connected) await player.connect()
    return await ctx.sendMessage({
      embeds: [
        embed.setColor(this.client.color.main).setDescription(
          ctx.locale('cmd.join.joined', {
            channelId: player.voiceChannelId,
          })
        ),
      ],
    })
  }
}
