import type { ButtonInteraction, ClientEvents, Message } from 'discord.js'
import type { LavalinkManagerEvents, NodeManagerEvents } from 'lavalink-client'

import type MahinaBot from '#common/mahina_bot'

// custom client events setupSystem and setupButtons
interface CustomClientEvents {
  setupSystem: (message: Message) => void
  setupButtons: (interaction: ButtonInteraction) => void
}

export type AllEvents = LavalinkManagerEvents &
  NodeManagerEvents &
  ClientEvents &
  CustomClientEvents

interface EventOptions {
  name: keyof AllEvents
  one?: boolean
}

export default class Event {
  client: MahinaBot
  one: boolean
  file: string
  name: keyof AllEvents
  fileName: string

  constructor(client: MahinaBot, file: string, options: EventOptions) {
    this.client = client
    this.file = file
    this.name = options.name
    this.one = options.one ?? false
    this.fileName = file.split('.')[0]
  }

  async run(..._args: any): Promise<void> {
    return await Promise.resolve()
  }
}
