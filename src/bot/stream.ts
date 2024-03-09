import { Client } from 'discord.js-selfbot-v13'
import { setStreamOpts, Streamer, streamLivestreamVideo } from '@dank074/discord-video-stream'
import { env } from '#src/env'
import { systemInfo } from '#src/system'

const client = new Client()

const streamer = new Streamer(client)
await streamer.client.login(env.DISC_USER_1_TOKEN)

// setStreamOpts({
//   width: 1920,
//   height: 1080,
//   fps: 30,
//   bitrateKbps: 3000,
//   maxBitrateKbps: 4000,
//   hardware_acceleration: true,
//   video_codec: 'H264',
// })

streamer.client.on('ready', async () => {
  console.log('Bot is ready')

  client.user?.setActivity({ name: 'Video streaming', type: 'STREAMING' })
  client.user?.setStatus('online')
})

client.on('messageCreate', (message) => {
  if (message.content === 'ping') {
    // send system info
    const info = systemInfo()

    // calculate the time it took to send the message
    const time = Date.now() - message.createdTimestamp

    // send the message
    message.reply(`Pong! ${time}ms\n${info}`)
  }
})

await streamer.joinVoice(env.DISC_GUILD_ID, env.DISC_CHANNEL_ID)

const udp = await streamer.createStream()

udp.mediaConnection.setSpeaking(true)
udp.mediaConnection.setVideoStatus(true)

// const c = client.channels.cache.get(env.DISC_CHANNEL_ID)
// c?.send('Stream: Kashmir - Surfing The Warm Industry')
//
// const t = client.channels.cache.get('1215293463009038443')
// t?.send('Tocando: Kashmir - Surfing The Warm Industry')

try {
  const res = await streamLivestreamVideo(
    'https://cdn.discordapp.com/attachments/993960897791922287/1215769787637043310/MULHER_201_MUITO_BOM_DIA.mp4?ex=65fdf4d9&is=65eb7fd9&hm=e4d7aa29b74ba4369077d94d320e32d8436e4668de4f6b9e6722e9cf1e7a9d74&',
    udp
  )

  console.log('Finished playing video ' + res)
} catch (e) {
  console.log(e)
} finally {
  udp.mediaConnection.setSpeaking(false)
  udp.mediaConnection.setVideoStatus(false)
}

export default streamer
