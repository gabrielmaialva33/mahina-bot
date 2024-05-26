import { BaseClient, Command, Context } from '#common/index'
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js'

export default class Generate extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'generate',
      description: {
        content: `Gera imagem através de um modelo`,
        examples: ['generate'],
        usage: 'generate',
      },
      category: 'ai',
      aliases: ['generate', 'generate'],
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
        {
          name: 'negative_prompt',
          description: 'Texto opcional sobre o que deseja evitar',
          type: ApplicationCommandOptionType.String,
          required: false,
          autocomplete: false,
        },
        {
          name: 'num_images',
          description: 'Número de imagens a serem geradas',
          type: ApplicationCommandOptionType.Integer,
          required: false,
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
    if (!models) return ctx.sendMessage('**Erro ao buscar modelos**')

    const imageModels = models.models.image
    const modelOptions = imageModels.map((model: { name: any; id: { toString: () => any } }) => {
      return {
        label: model.name,
        value: model.id.toString(),
      }
    })

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

    collector.on('collect', async (interaction) => {
      const modelId = +interaction.customId.split('_')[2]
      await interaction.deferReply()

      const selectModelName = imageModels.find((model: { id: any }) => model.id === modelId).name

      const response = await client.lexica.generateImage(modelId, prompt)
      if (!response) return ctx.sendMessage('**Erro ao gerar imagem**')

      const { task_id: taskId, request_id: requestId } = response as unknown as {
        task_id: string
        request_id: string
      }

      // create a loop to check if the image is ready
      const checkImageStatus = async () => {
        const statusResponse = await client.lexica.getImages(taskId, requestId)

        if (statusResponse.message === 'finished') {
          const imageUrl = statusResponse.img_urls[0]
          await interaction.editReply({
            content: `**Prompt**: ${prompt}\n**Modelo selecionado**: ${selectModelName}\n**Task ID**: ${taskId}`,
            files: [imageUrl],
          })
        } else setTimeout(checkImageStatus, 5000)
      }

      // start the loop
      checkImageStatus()
    })

    collector.on('end', (collected) => {
      if (!collected.size) {
        ctx.sendMessage('**Tempo esgotado para seleção do modelo.**')
      }
    })
  }
}
