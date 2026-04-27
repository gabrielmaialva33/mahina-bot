import { type GuildMember } from 'discord.js'
import Event from '#common/event'
import type MahinaBot from '#common/mahina_bot'

export default class GuildMemberAdd extends Event {
  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'guildMemberAdd',
    })
  }

  async run(member: GuildMember): Promise<void> {
    if (!this.client.runtime.ai || member.user.bot) return
    this.client.services.serverAwareness?.observeMemberJoin(member)
    await this.client.services.ambientPresence?.sendMemberWelcome(member)
  }
}
