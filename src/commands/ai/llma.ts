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
        content: `Reconhecimento de imagem`,
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
          autocomplete: true,
        },
      ],
    })
  }

  async run(client: BaseClient, ctx: Context, args: string[]): Promise<any> {
    console.log(`ctx.guild: ${ctx.guild}`)
    console.log(`ctx.member: ${ctx.member}`)
    console.log(`ctx.message: ${ctx.message}`)
    console.log(`ctx.interaction: ${ctx.interaction}`)
    console.log(`args: ${args}`)

    if (!ctx.channel) return
    if (!ctx.guild) return
    if (!ctx.author) return

    const prompt = args.join(' ').trim()

    client.logger.info(`Prompt: ${prompt}`)

    // get models from lexica
    const models = await client.lexica.getModels()
    if (!models) return ctx.sendMessage('Erro ao buscar modelos')

    const chatModels = models.models.chat
    console.log(chatModels)

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

    await ctx.sendMessage({ content: 'Selecione o modelo', components: rows })

    // handler for button selection
    const filter = (interaction: any) =>
      interaction.customId.startsWith('select_model_') && interaction.user.id === ctx.author!.id
    const collector = ctx.channel.createMessageComponentCollector({ filter, time: 60000 })

    collector.on('collect', async (interaction: any) => {
      const selectedModelId = interaction.customId.split('_')[2]
      await interaction.deferUpdate()
      const response = await client.lexica.chatCompletion(prompt, Number.parseInt(selectedModelId))
      if (!response) return ctx.sendMessage('Erro ao buscar resposta')

      // {
      //   message: 'ok',
      //   content: "Hello! It sounds like you're testing me out.  I'm happy to help in any way I can.  Is there anything specific you'd like me to try?  I can answer your questions in an informative way,  complete your requests thoughtfully, or generate different creative text formats,  like poems, code, scripts, musical pieces, email, letters, etc.  Just let me know what's on your mind.",
      //   images: [],
      //   code: 2
      // }

      const selectModelName = chatModels.find(
        (model: { id: any }) => model.id === Number.parseInt(selectedModelId)
      ).name

      await ctx.editMessage({
        //content: `\`\`\`yml\n${response.content}\n\`\`\``,
        content: `**Modelo selecionado**: **${selectModelName}**\n\n${response.content}`,
        components: [],
      })
    })

    collector.on('end', (collected) => {
      if (!collected.size) {
        ctx.editMessage({
          content: 'Tempo esgotado para seleção do modelo.',
          components: [],
        })
      }
    })
  }
}
