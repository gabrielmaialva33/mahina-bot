import { Client } from 'discord.js-selfbot-v13'
import { DiscordStreamClient } from 'discord-stream-client'
import { env } from '#src/env'
import { systemInfo } from '#src/utils/system'

const disc = new Client()
export const st = new DiscordStreamClient(disc)
st.client.login(env.DISC_USER_1_TOKEN)

st.client.on('ready', async (client) => {
  console.log('Ready!', client.user.tag)

  const channel = client.channels.cache.get('772951913531834368')
  const connection = await client.streamClient.joinVoiceChannel(channel, {
    selfDeaf: true,
    selfMute: true,
    selfVideo: false,
  })
  const stream = await connection.createStream(true)
  const player = client.streamClient.createPlayer(
    'https://cdn.discordapp.com/attachments/844636180012204083/1216264059159187496/ssstik.io_1710050302475.mp4?ex=65ffc12c&is=65ed4c2c&hm=83ea79398957bfd9cab3a471c0c2fec27870a865eb0a5d334040bd9efea423a8&',
    stream.udp!
  )
  player.on('error', (err) => console.error(err))
  player.play({
    kbpsVideo: 7000, // FHD 60fps
    fps: 60,
    hwaccel: true,
    kbpsAudio: 320,
    volume: 1,
  })
})

st.client.on('messageCreate', (message) => {
  if (message.content === 'ping') {
    // send system info
    const info = systemInfo()

    // calculate the time it took to send the message
    const time = Date.now() - message.createdTimestamp

    // send the message
    message.reply(`***Pong!*** ${time}ms\n${info}`)
  }
})
