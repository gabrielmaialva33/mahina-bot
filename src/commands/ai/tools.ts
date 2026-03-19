import {
  ApplicationCommandOptionType,
  ButtonInteraction,
  ComponentType,
  EmbedBuilder,
  Message,
  MessageFlags,
  StringSelectMenuInteraction,
} from 'discord.js'
import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
import { chatWithPreferredAI, getLastAIRoute } from '#common/ai_runtime'
import {
  createDefaultAITools,
  createToolButtons,
  createToolCopyContent,
  createToolExportAttachment,
  createToolHelpEmbed,
  createToolLoadingEmbed,
  createToolResultEmbed,
  createToolSelectorEmbed,
  createToolSelectorMenu,
  findAITool,
  getAIToolKey,
  type AIToolDefinition,
} from '#common/tools_runtime'

export default class ToolsCommand extends Command {
  private tools: Map<string, AIToolDefinition>

  constructor(client: MahinaBot) {
    super(client, {
      name: 'tools',
      description: {
        content: 'Ferramentas avançadas de IA para análise, tradução, documentação e mais!',
        examples: [
          'tools',
          'tools analyze-sentiment Estou muito feliz hoje!',
          'tools translate pt-en Olá mundo',
        ],
        usage: 'tools [ferramenta] [argumentos]',
      },
      category: 'ai',
      aliases: ['tool', 'ai-tools', 'ferramentas'],
      cooldown: 3,
      args: false,
      player: {
        voice: false,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'ferramenta',
          description: 'Escolha uma ferramenta',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '💭 Análise de Sentimento', value: 'sentiment' },
            { name: '🌍 Tradutor Inteligente', value: 'translate' },
            { name: '📄 Resumo de Texto', value: 'summarize' },
            { name: '📚 Gerador de Documentação', value: 'docs' },
            { name: '🔍 Análise de Complexidade', value: 'complexity' },
            { name: '⚡ Otimizador de Código', value: 'optimize' },
            { name: '🎯 Gerador de Testes', value: 'tests' },
            { name: '🔐 Análise de Segurança', value: 'security' },
          ],
        },
        {
          name: 'input',
          description: 'Texto ou código para processar',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    })

    this.tools = createDefaultAITools()
  }

  public async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    // If no tool specified, show tool selector
    if (!args[0]) {
      return this.showToolSelector(ctx)
    }

    const toolKey = args[0].toLowerCase()
    const tool = findAITool(this.tools, toolKey)

    if (!tool) {
      return ctx.sendMessage(t('ai.tools.errors.tool_not_found'))
    }

    const input = args.slice(1).join(' ')
    if (!input) {
      return this.showToolHelp(ctx, tool)
    }

    await this.executeTool(ctx, tool, input)
  }

  private async showToolSelector(ctx: Context): Promise<Message> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const msg = await ctx.sendMessage({
      embeds: [createToolSelectorEmbed(this.client.config.color.main, t, this.tools)],
      components: [createToolSelectorMenu(t, this.tools)],
    })

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000,
    })

    collector.on('collect', async (interaction: StringSelectMenuInteraction) => {
      if (interaction.user.id !== ctx.author?.id) {
        return interaction.reply({
          content: t('ai.tools.errors.author_only_menu'),
          flags: MessageFlags.Ephemeral,
        })
      }

      const selectedTool = this.tools.get(interaction.values[0])
      if (selectedTool) {
        await interaction.reply({
          content: t('ai.tools.messages.tool_selected', {
            emoji: selectedTool.emoji,
            name: selectedTool.name,
            key: interaction.values[0],
          }),
          flags: MessageFlags.Ephemeral,
        })
      }
    })
  }

  private async showToolHelp(ctx: Context, tool: AIToolDefinition): Promise<Message> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    await ctx.sendMessage({
      embeds: [
        createToolHelpEmbed(this.client.config.color.blue, t, tool, getAIToolKey(this.tools, tool)),
      ],
    })
  }

  private async executeTool(ctx: Context, tool: AIToolDefinition, input: string): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const msg = await ctx.sendMessage({
      embeds: [createToolLoadingEmbed(this.client.config.color.violet, t, tool)],
    })

    try {
      const response = await chatWithPreferredAI(this.client, {
        userId: ctx.author!.id,
        message: input,
        systemPrompt: tool.systemPrompt,
        options: {
          temperature: 0.3,
          maxTokens: 2048,
        },
      })
      const route = getLastAIRoute(ctx.author!.id)
      const routeLabel = route ? `${route.provider} · ${route.model}` : undefined

      await msg.edit({
        embeds: [
          createToolResultEmbed(this.client.config.color.green, t, tool, response, routeLabel),
        ],
        components: [createToolButtons(t)],
      })

      // Handle button interactions
      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000,
      })

      collector.on('collect', async (interaction: ButtonInteraction) => {
        if (interaction.user.id !== ctx.author?.id) {
          return interaction.reply({
            content: t('ai.tools.errors.author_only_buttons'),
            flags: MessageFlags.Ephemeral,
          })
        }

        switch (interaction.customId) {
          case 'tool_export':
            await interaction.reply({
              files: [
                createToolExportAttachment(
                  t,
                  tool,
                  getAIToolKey(this.tools, tool),
                  input,
                  response
                ),
              ],
              flags: MessageFlags.Ephemeral,
            })
            break

          case 'tool_retry':
            await interaction.deferUpdate()
            await this.executeTool(ctx, tool, input)
            break

          case 'tool_copy':
            await interaction.reply({
              content: createToolCopyContent(t, response),
              flags: MessageFlags.Ephemeral,
            })
            break
        }
      })
    } catch (error) {
      console.error('Tool execution error:', error)

      const errorEmbed = new EmbedBuilder()
        .setColor(this.client.config.color.red)
        .setTitle(t('ai.tools.errors.title'))
        .setDescription(t('ai.tools.errors.processing_error'))

      await msg.edit({ embeds: [errorEmbed], components: [] })
    }
  }
}
