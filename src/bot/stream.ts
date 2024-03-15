import { Client } from 'discord.js-selfbot-v13'
import { setStreamOpts, Streamer, streamLivestreamVideo } from '@dank074/discord-video-stream'
import { env } from '#src/env'
import { systemInfo } from '#src/utils/system'

const client = new Client()

const streamer = new Streamer(client)
await streamer.client.login(env.DISC_USER_1_TOKEN)

setStreamOpts({
  width: 1920,
  height: 1080,
  fps: 30,
  bitrateKbps: 3000,
  maxBitrateKbps: 4000,
  hardware_acceleration: true,
  video_codec: 'H264',
})

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

const c = client.channels.cache.get('841806744636489748')
// @ts-ignore
c?.send('*** Stream: Kashmir - Surfing The Warm Industry ***')

try {
  const res = await streamLivestreamVideo(
    'https://cdn.discordapp.com/attachments/1215462973330423849/1215686998862598154/Kashmir_-_Surfing_The_Warm_Industry.mp4?ex=65fda7be&is=65eb32be&hm=dada45e73ee2737bfd5b7a83e486f311a69d5c76cbfb4b3c7fc9c4eb39c6b4dd&',
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
