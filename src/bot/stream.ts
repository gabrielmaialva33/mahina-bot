import { Client } from 'discord.js-selfbot-v13'
import { Streamer, streamLivestreamVideo } from '@dank074/discord-video-stream'
import { env } from '#src/env'

const streamer = new Streamer(new Client())
await streamer.client.login(env.DISC_USER_1_TOKEN)

// const opts = {
//   width: 1280,
//   height: 720,
//   fps: 30,
//   bitrateKbps: 1000,
//   maxBitrateKbps: 2500,
//   hardware_acceleration: false,
//   videoCodec: 'H264',
// }

streamer.client.on('ready', () => {
  console.log('Bot is ready')
})

await streamer.joinVoice(env.DISC_GUILD_ID, env.DISC_CHANNEL_ID)

const udp = await streamer.createStream()

udp.mediaConnection.setSpeaking(true)
udp.mediaConnection.setVideoStatus(true)
try {
  const res = await streamLivestreamVideo(
    'https://cdn.discordapp.com/attachments/1214727206106955856/1215632508843065364/Rick_Astley_-_Never_Gonna_Give_You_Up_Official_Music_Video.mp4?ex=65fd74ff&is=65eaffff&hm=79ac61581d7b2316526f28290599d56ae64ab63d880478642a548e496b308e1e&',
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
