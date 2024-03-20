import { Player } from 'shoukaku'

import { Dispatcher, Event, BaseClient, Song } from '#common/index'

export default class TrackEnd extends Event {
  constructor(client: BaseClient, file: string) {
    super(client, file, { name: 'trackEnd' })
  }

  async run(_player: Player, track: Song, dispatcher: Dispatcher): Promise<void> {
    dispatcher.previous = dispatcher.current
    dispatcher.current = null
    const m = await dispatcher.nowPlayingMessage?.fetch().catch(() => {})
    if (dispatcher.loop === 'repeat') dispatcher.queue.unshift(track)
    if (dispatcher.loop === 'queue') dispatcher.queue.push(track)
    await dispatcher.play()
    if (dispatcher.autoplay) {
      await dispatcher.Autoplay(track)
    }
    if (m && m.deletable) await m.delete().catch(() => {})
  }
}
