import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'

export default {
  data: new SlashCommandBuilder().setName('ping').setDescription('Mostra o ping médio do bot.'),
  cooldown: 1,
  execute(interaction: ChatInputCommandInteraction) {
    interaction
      .reply({
        content: `🏓 Pong! ${Date.now() - interaction.createdTimestamp}ms`,
        ephemeral: true,
      })
      .catch(console.error)
  },
}
