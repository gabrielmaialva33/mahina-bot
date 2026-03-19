import { type ClientOptions, GatewayIntentBits } from 'discord.js'

import app from '#src/server'
import { env } from '#src/env'
import MahinaBot from '#common/mahina_bot'

const {
  GuildMembers,
  MessageContent,
  GuildVoiceStates,
  GuildMessages,
  Guilds,
  GuildMessageTyping,
} = GatewayIntentBits

const clientOptions: ClientOptions = {
  intents: [
    Guilds,
    GuildMessages,
    MessageContent,
    GuildVoiceStates,
    GuildMembers,
    GuildMessageTyping,
  ],
  allowedMentions: { parse: ['users', 'roles'], repliedUser: false },
}

const client = new MahinaBot(clientOptions)

async function bootstrap(): Promise<void> {
  try {
    await client.start(env.TOKEN)

    if (env.ENABLE_SELFBOT && env.SELF_USER_TOKEN) {
      await client.selfbot?.start(env.SELF_USER_TOKEN)
    } else if (env.ENABLE_SELFBOT) {
      client.logger.warn('Selfbot runtime is enabled but SELF_USER_TOKEN is missing')
    }
  } catch (error) {
    client.logger.error('Failed to bootstrap Mahina runtime:', error)
    process.exitCode = 1
  }
}

void bootstrap()

app.listen(env.PORT, () => {
  client.logger.info(`Server started on port ${env.PORT}`)
})
