import { Connectors, Shoukaku } from 'shoukaku'
import { Mahina } from '#common/mahina'
import { env } from '#src/env'

export class ShoukakuClient extends Shoukaku {
  client: Mahina

  constructor(client: Mahina) {
    super(
      new Connectors.DiscordJS(client),
      [
        {
          name: env.LAVALINK_NAME,
          url: env.LAVALINK_URL,
          auth: env.LAVALINK_AUTH,
          secure: true,
        },
      ],
      {
        moveOnDisconnect: false,
        resume: false,
        reconnectInterval: 30,
        reconnectTries: 2,
        restTimeout: 10000,
        userAgent: `${client.env.DISC_BOT_NAME.normalize('NFKC')} (@mrootx)`,
        nodeResolver: (nodes) =>
          [...nodes.values()]
            .filter((node) => node.state === 2)
            .sort((a, b) => a.penalties - b.penalties)
            .shift(),
      }
    )
    this.client = client

    this.on('ready', (name, reconnected) =>
      this.client.shoukaku.emit(reconnected ? 'nodeReconnect' : 'nodeConnect', name)
    )
    this.on('close', (name, code, reason) =>
      this.client.shoukaku.emit('nodeDisconnect', name, code, reason)
    )

    this.on('error', (name, error) => this.client.shoukaku.emit('nodeError', name, error))
    this.on('disconnect', (name, count) => this.client.shoukaku.emit('nodeDisconnect', name, count))
    this.on('debug', (name, reason) => this.client.shoukaku.emit('nodeRaw', name, reason))
  }
}
