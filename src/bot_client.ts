import { ClientOptions, GatewayIntentBits } from 'discord.js'

import { env } from '#src/env'

import { BaseClient } from '#common/base_client'

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
if (env.DISC_USER_1_TOKEN.trim()) {
  client.start(env.DISC_BOT_TOKEN).then(() => client.logger.info('Bot is ready'))
  client.selfClient
    .start(env.DISC_USER_1_TOKEN)
    .then(() => client.logger.info('Self bot 1 is ready'))
}
