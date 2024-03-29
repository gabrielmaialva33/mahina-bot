import { ClientOptions, GatewayIntentBits } from 'discord.js'

import { env } from '#src/env'

import { BaseClient } from '#common/base_client'
import { SelfClient } from '#common/self_client'

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

const client = new BaseClient(options)

client.start(env.DISC_BOT_TOKEN).then(() => client.logger.info('Bot is ready'))

const streamer = new SelfClient()
streamer.start(env.DISC_USER_TOKEN).then(() => client.logger.info('Self bot is ready'))
