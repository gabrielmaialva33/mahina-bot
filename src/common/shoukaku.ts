import { Connectors, Shoukaku } from 'shoukaku'
import { Mahina } from '#common/mahina'

export class ShoukakuClient extends Shoukaku {
  client: Mahina

  constructor(client: Mahina) {
    super(
      new Connectors.DiscordJS(client),
      [
        {
          name: 'Mahina',
          url: '0.0.0.0:2333',
          auth: 'Mahina@551238',
          secure: false,
        },
      ],
      {
        moveOnDisconnect: false,
        resume: false,
        reconnectInterval: 30,
        reconnectTries: 2,
        restTimeout: 10000,
        userAgent: `Mahina (@mrootx)`,
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
