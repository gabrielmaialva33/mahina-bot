import { ClientOptions, GatewayIntentBits } from 'discord.js'

import { env } from '#src/env'
import { Mahina } from '#common/mahina'

const options: ClientOptions = {
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageTyping,
  ],
  allowedMentions: {
    parse: ['users', 'roles'],
    repliedUser: false,
  },
}

const client = new Mahina(options)

client.start(env.DISC_BOT_TOKEN)
