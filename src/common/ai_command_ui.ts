import { type APIEmbed, EmbedBuilder } from 'discord.js'
import type MahinaBot from '#common/mahina_bot'

export function createAILoadingEmbed(client: MahinaBot, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(client.config.color.violet)
    .setDescription(description)
    .setFooter({ text: 'Mahina AI • Powered by NVIDIA' })
}

export function createAIErrorEmbed(
  client: MahinaBot,
  description: string,
  title = '❌ Erro'
): APIEmbed {
  return {
    title,
    description,
    color: client.config.color.red,
  }
}

export function createAIResultEmbed(
  client: MahinaBot,
  title: string,
  description: string,
  fields: APIEmbed['fields'] = []
): APIEmbed {
  return {
    title,
    description,
    fields,
    color: 0x76b900,
    timestamp: new Date().toISOString(),
  }
}

export function splitDiscordMessage(content: string, maxLength = 1900): string[] {
  return content.match(new RegExp(`[\\s\\S]{1,${maxLength}}`, 'g')) || []
}
