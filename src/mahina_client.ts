import { type ClientOptions, GatewayIntentBits } from 'discord.js'
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
client.start(env.TOKEN).catch(console.error)
