import { BaseClient, Command, Context } from '#common/index'
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js'

export default class Llma extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'llma',
      description: {
        content: `Gera texto com base em um modelo`,
        examples: ['llma'],
        usage: 'llma',
      },
      category: 'ai',
      aliases: ['llma', 'llma'],
      cooldown: 3,
      args: true,
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks', 'AttachFiles'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'prompt',
          description: 'Texto opcional sobre o que deseja analisar',
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: false,
        },
      ],
    })
  }

  async run(client: BaseClient, ctx: Context, args: string[]): Promise<any> {
    if (!ctx.channel) return
    if (!ctx.guild) return
    if (!ctx.author) return

    const prompt = args.join(' ').trim()

    // get models from lexica
    const models = await client.lexica.getModels()
    if (!models) return ctx.sendMessage('Erro ao buscar modelos')

    const chatModels = models.models.chat

    const modelOptions = chatModels.map((model: { name: any; id: { toString: () => any } }) => {
      return {
        label: model.name,
        value: model.id.toString(),
      }
    })

    // split buttons into multiple rows
    const rows = []
    for (let i = 0; i < modelOptions.length; i += 5) {
      const slicedModels = modelOptions.slice(i, i + 5)
      const buttons = slicedModels.map((model: { label: any; value: any }) => {
        return new ButtonBuilder()
          .setCustomId(`select_model_${model.value}`)
          .setLabel(model.label)
          .setStyle(ButtonStyle.Primary)
      })

      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons))
    }

    await ctx.sendMessage({ content: '**Selecione o modelo**', components: rows })

    // handler for button selection
    const filter = (interaction: any) =>
      interaction.customId.startsWith('select_model_') && interaction.user.id === ctx.author!.id
    const collector = ctx.channel.createMessageComponentCollector({ filter, time: 60000 })

    collector.on('collect', async (interaction: any) => {
      const selectedModelId = interaction.customId.split('_')[2]
      await interaction.deferReply()
      const response = await client.lexica.chatCompletion(prompt, Number.parseInt(selectedModelId))
      if (!response) return ctx.sendMessage('Erro ao buscar resposta')

      const selectModelName = chatModels.find(
        (model: { id: any }) => model.id === Number.parseInt(selectedModelId)
      ).name

      await interaction.message.edit({
        content: `**Modelo selecionado**: **${selectModelName}**\n**Prompt**: ${prompt}`,
        components: [],
      })

      const fullResponse = response.content
      const messageParts = this.splitMessage(fullResponse, 2000)

      for (const part of messageParts) await interaction.followUp(part)
    })

    collector.on('end', (collected) => {
      if (!collected.size) {
        ctx.editMessage({
          content: '**Tempo esgotado para seleção do modelo.**',
          components: [],
        })
      }
    })
  }

  splitMessage(message: string, maxLength: number): string[] {
    const parts = []
    let start = 0

    while (start < message.length) {
      let end = start + maxLength
      if (end > message.length) end = message.length

      // Certifique-se de não cortar no meio de uma palavra
      if (end < message.length && message[end] !== ' ' && message[end - 1] !== ' ') {
        end = message.lastIndexOf(' ', end)
        if (end === -1) end = start + maxLength
      }

      parts.push(message.substring(start, end).trim())
      start = end
    }

    return parts
  }
}
