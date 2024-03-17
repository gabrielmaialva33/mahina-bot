import { Guild } from 'discord.js'
import { LavalinkResponse, Node } from 'shoukaku'

import { Dispatcher, Mahina } from '#common/index'
export class Queue extends Map {
  client: Mahina
  constructor(client: Mahina) {
    super()
    this.client = client
  }
  get(guildId: string): Dispatcher {
    return super.get(guildId)
  }
  set(guildId: string, dispatcher: Dispatcher): this {
    return super.set(guildId, dispatcher)
  }
  delete(guildId: string): boolean {
    return super.delete(guildId)
  }
  clear(): void {
    return super.clear()
  }

  async create(guild: Guild, voice: any, channel: any, givenNode?: Node): Promise<Dispatcher> {
    let dispatcher = this.get(guild.id)
    if (!voice) throw new Error('No voice channel was provided')
    if (!channel) throw new Error('No text channel was provided')
    if (!guild) throw new Error('No guild was provided')
    if (!dispatcher) {
      const node =
        givenNode || this.client.shoukaku.options.nodeResolver(this.client.shoukaku.nodes)
      if (!node) throw new Error('No available nodes')

      const player = await this.client.shoukaku.joinVoiceChannel({
        guildId: guild.id,
        channelId: voice.id,
        shardId: guild.shard.id,
        deaf: true,
      })

      dispatcher = new Dispatcher({
        client: this.client,
        guildId: guild.id,
        channelId: channel.id,
        player,
        node,
      })

      this.set(guild.id, dispatcher)
      this.client.shoukaku.emit('playerCreate', dispatcher.player)
      return dispatcher
    } else {
      return dispatcher
    }
  }

  async search(query: string): Promise<LavalinkResponse | undefined> {
    const node = this.client.shoukaku.options.nodeResolver(this.client.shoukaku.nodes)
    if (!node) throw new Error('No available nodes')

    const regex = /^https?:\/\//
    let result: LavalinkResponse | undefined
    try {
      result = await node.rest.resolve(
        regex.test(query) ? query : `${this.client.env.SEARCH_ENGINE}:${query}`
      )
    } catch (err) {
      this.client.logger.error(err)
      return undefined
    }
    return result
  }
}
