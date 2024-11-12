import { type Message, TextChannel } from 'discord.js'

import { T } from '#common/i18n'
import Event from '#common/event'
import type MahinaBot from '#common/mahina_bot'

import { oops, setupStart } from '#utils/setup_system'

export default class SetupSystem extends Event {
  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'setupSystem',
    })
  }

  async run(message: Message): Promise<any> {
    const locale = await this.client.db.getLanguage(message.guildId!)
    const channel = message.channel as TextChannel
    if (!(channel instanceof TextChannel)) return
    if (!message.member?.voice.channel) {
      await oops(channel, T(locale, 'event.message.no_voice_channel_queue'))
      await message.delete().catch(() => {
        null
      })
      return
    }

    const voiceChannel = message.member.voice.channel
    const clientUser = this.client.user
    const clientMember = message.guild?.members.cache.get(clientUser!.id)

    /*  if (voiceChannel && clientUser && !voiceChannel?.permissionsFor(clientUser!).has(PermissionsBitField.Flags.Connect | PermissionsBitField.Flags.Speak)) {
                                await oops(
                                    channel,
                                    T(locale, "event.message.no_permission_connect_speak", {
                                        channel: voiceChannel.id,
                                    }),
                                );
                                await message.delete().catch(() => {});
                                return;
                            } */

    if (clientMember?.voice.channel && clientMember.voice.channelId !== voiceChannel.id) {
      await oops(
        channel,
        T(locale, 'event.message.different_voice_channel_queue', {
          channel: clientMember.voice.channelId,
        })
      )
      await message.delete().catch(() => {
        null
      })
      return
    }

    let player = this.client.manager.getPlayer(message.guildId!)
    if (!player) {
      player = this.client.manager.createPlayer({
        guildId: message.guildId!,
        voiceChannelId: voiceChannel.id,
        textChannelId: message.channelId,
        selfMute: false,
        selfDeaf: true,
        vcRegion: voiceChannel.rtcRegion!,
      })
      if (!player.connected) await player.connect()
    }

    await setupStart(this.client, message.content, player, message)
    await message.delete().catch(() => {
      null
    })
  }
}
