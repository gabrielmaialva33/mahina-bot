import { Player } from 'shoukaku'

import { Dispatcher, Event, Mahina, Song } from '#common/index'
import { updateSetup } from '#utils/setup_system'

export default class QueueEnd extends Event {
  constructor(client: Mahina, file: string) {
    super(client, file, { name: 'queueEnd' })
  }

  async run(_player: Player, track: Song, dispatcher: Dispatcher): Promise<void> {
    const guild = this.client.guilds.cache.get(dispatcher.guildId)
    if (!guild) return
    if (dispatcher.loop === 'repeat') dispatcher.queue.unshift(track)
    if (dispatcher.loop === 'queue') dispatcher.queue.push(track)
    if (dispatcher.autoplay) {
      await dispatcher.Autoplay(track)
    } else {
      dispatcher.autoplay = false
    }
    if (dispatcher.loop === 'off') {
      dispatcher.previous = dispatcher.current
      dispatcher.current = null
    }
    await updateSetup(this.client, guild)
    this.client.utils.updateStatus(this.client, guild.id)
  }
}
