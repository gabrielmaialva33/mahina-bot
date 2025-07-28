import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
} from 'discord.js'
import OpenAI from 'openai'
import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'

interface Tool {
  name: string
  description: string
  emoji: string
  systemPrompt: string
  examples: string[]
}

export default class ToolsCommand extends Command {
  private openai: OpenAI
  private tools: Map<string, Tool>

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

    this.openai = new OpenAI({
      apiKey:
        process.env.NVIDIA_API_KEY ||
        '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',
      baseURL: 'https://integrate.api.nvidia.com/v1',
    })

    this.tools = new Map([
      [
        'sentiment',
        {
          name: 'Análise de Sentimento',
          description: 'Analisa o sentimento e emoções em um texto',
          emoji: '💭',
          systemPrompt: `Analise o sentimento do texto fornecido. Identifique:
        - Sentimento geral (positivo, negativo, neutro)
        - Emoções específicas detectadas
        - Intensidade do sentimento (0-100%)
        - Palavras-chave que indicam o sentimento
        Formate a resposta de forma clara e estruturada.`,
          examples: ['Estou muito feliz!', 'Este produto é terrível'],
        },
      ],
      [
        'translate',
        {
          name: 'Tradutor Inteligente',
          description: 'Traduz texto preservando contexto e nuances',
          emoji: '🌍',
          systemPrompt: `Você é um tradutor profissional.
        Traduza o texto preservando:
        - Contexto e significado
        - Tom e estilo
        - Expressões idiomáticas (adaptando quando necessário)
        - Formatação original
        Indique sempre os idiomas de origem e destino.`,
          examples: ['Hello world', 'Bom dia, como está?'],
        },
      ],
      [
        'summarize',
        {
          name: 'Resumo de Texto',
          description: 'Cria resumos inteligentes de textos longos',
          emoji: '📄',
          systemPrompt: `Crie um resumo conciso e informativo do texto fornecido.
        Inclua:
        - Pontos principais
        - Informações críticas
        - Conclusões importantes
        Mantenha o resumo entre 20-30% do tamanho original.`,
          examples: ['[texto longo para resumir]'],
        },
      ],
      [
        'docs',
        {
          name: 'Gerador de Documentação',
          description: 'Gera documentação profissional para código',
          emoji: '📚',
          systemPrompt: `Gere documentação profissional para o código fornecido.
        Inclua:
        - Descrição geral da funcionalidade
        - Parâmetros e tipos
        - Valores de retorno
        - Exemplos de uso
        - Possíveis erros
        Use formato JSDoc/TSDoc quando apropriado.`,
          examples: ['function calculate(a, b) { return a + b; }'],
        },
      ],
      [
        'complexity',
        {
          name: 'Análise de Complexidade',
          description: 'Analisa a complexidade e qualidade do código',
          emoji: '🔍',
          systemPrompt: `Analise a complexidade do código fornecido.
        Avalie:
        - Complexidade ciclomática
        - Complexidade cognitiva
        - Acoplamento e coesão
        - Manutenibilidade
        - Possíveis code smells
        Dê uma nota de A-F e sugestões de melhoria.`,
          examples: ['[código para analisar]'],
        },
      ],
      [
        'optimize',
        {
          name: 'Otimizador de Código',
          description: 'Sugere otimizações de performance e qualidade',
          emoji: '⚡',
          systemPrompt: `Otimize o código fornecido focando em:
        - Performance
        - Legibilidade
        - Manutenibilidade
        - Boas práticas
        - Redução de complexidade
        Explique cada otimização sugerida.`,
          examples: ['[código para otimizar]'],
        },
      ],
      [
        'tests',
        {
          name: 'Gerador de Testes',
          description: 'Gera testes unitários e de integração',
          emoji: '🎯',
          systemPrompt: `Gere testes completos para o código fornecido.
        Inclua:
        - Testes unitários
        - Casos de borda
        - Testes de erro
        - Mocks quando necessário
        Use o framework de testes mais apropriado para a linguagem.`,
          examples: ['[função ou classe para testar]'],
        },
      ],
      [
        'security',
        {
          name: 'Análise de Segurança',
          description: 'Identifica vulnerabilidades e problemas de segurança',
          emoji: '🔐',
          systemPrompt: `Analise o código em busca de vulnerabilidades de segurança.
        Verifique:
        - Injection attacks (SQL, XSS, etc.)
        - Autenticação e autorização
        - Exposição de dados sensíveis
        - Validação de entrada
        - Dependências vulneráveis
        Classifique por severidade e sugira correções.`,
          examples: ['[código para análise de segurança]'],
        },
      ],
    ])
  }

  public async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    // If no tool specified, show tool selector
    if (!args[0]) {
      return this.showToolSelector(ctx)
    }

    const toolKey = args[0].toLowerCase()
    const tool = this.findTool(toolKey)

    if (!tool) {
      return ctx.sendMessage(
        '❌ Ferramenta não encontrada! Use o comando sem argumentos para ver as opções.'
      )
    }

    const input = args.slice(1).join(' ')
    if (!input) {
      return this.showToolHelp(ctx, tool)
    }

    await this.executeTool(ctx, tool, input)
  }

  private findTool(key: string): Tool | undefined {
    // Try exact match first
    if (this.tools.has(key)) {
      return this.tools.get(key)
    }

    // Try to find by partial match
    for (const [toolKey, tool] of this.tools) {
      if (toolKey.includes(key) || tool.name.toLowerCase().includes(key)) {
        return tool
      }
    }

    return undefined
  }

  private async showToolSelector(ctx: Context) {
    const embed = new EmbedBuilder()
      .setColor(this.client.config.color.main)
      .setTitle('🛠️ Ferramentas de IA Disponíveis')
      .setDescription(
        'Selecione uma ferramenta no menu abaixo ou use:\n`!tools [ferramenta] [seu texto/código]`'
      )
      .setFooter({ text: 'Powered by NVIDIA AI' })

    // Add tool descriptions
    for (const [key, tool] of this.tools) {
      embed.addFields({
        name: `${tool.emoji} ${tool.name}`,
        value: `${tool.description}\n**Uso:** \`!tools ${key} [input]\``,
        inline: true,
      })
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('tool_selector')
      .setPlaceholder('Escolha uma ferramenta...')
      .addOptions(
        Array.from(this.tools.entries()).map(([key, tool]) => ({
          label: tool.name,
          description: tool.description.substring(0, 100),
          value: key,
          emoji: tool.emoji,
        }))
      )

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)

    const msg = await ctx.sendMessage({ embeds: [embed], components: [row] })

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000,
    })

    collector.on('collect', async (interaction: any) => {
      if (interaction.user.id !== ctx.author.id) {
        return interaction.reply({
          content: 'Apenas o autor do comando pode usar este menu!',
          flags: MessageFlags.Ephemeral,
        })
      }

      const selectedTool = this.tools.get(interaction.values[0])
      if (selectedTool) {
        await interaction.reply({
          content: `Você selecionou: **${selectedTool.emoji} ${selectedTool.name}**\n\nAgora use: \`!tools ${interaction.values[0]} [seu input]\`\n\n**Exemplos:**\n${selectedTool.examples.map((ex) => `• \`!tools ${interaction.values[0]} ${ex}\``).join('\n')}`,
          flags: MessageFlags.Ephemeral,
        })
      }
    })
  }

  private async showToolHelp(ctx: Context, tool: Tool) {
    const embed = new EmbedBuilder()
      .setColor(this.client.config.color.blue)
      .setTitle(`${tool.emoji} ${tool.name}`)
      .setDescription(tool.description)
      .addFields(
        {
          name: '📝 Como usar',
          value: `\`!tools ${Array.from(this.tools.entries()).find(([k, t]) => t === tool)?.[0]} [seu input]\``,
        },
        {
          name: '💡 Exemplos',
          value: tool.examples.map((ex) => `• ${ex}`).join('\n'),
        }
      )
      .setFooter({ text: 'Forneça um texto ou código para processar!' })

    await ctx.sendMessage({ embeds: [embed] })
  }

  private async executeTool(ctx: Context, tool: Tool, input: string) {
    const loadingEmbed = new EmbedBuilder()
      .setColor(this.client.config.color.violet)
      .setDescription(`${tool.emoji} **Processando com ${tool.name}...**`)

    const msg = await ctx.sendMessage({ embeds: [loadingEmbed] })

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'meta/llama-3.1-405b-instruct',
        messages: [
          { role: 'system', content: tool.systemPrompt },
          { role: 'user', content: input },
        ],
        temperature: 0.3,
        top_p: 0.9,
        max_tokens: 2048,
      })

      const response =
        completion.choices[0]?.message?.content || 'Não foi possível processar sua solicitação.'

      const resultEmbed = new EmbedBuilder()
        .setColor(this.client.config.color.green)
        .setTitle(`${tool.emoji} ${tool.name} - Resultado`)
        .setDescription(response.length > 4000 ? response.substring(0, 4000) + '...' : response)
        .setFooter({
          text: 'Powered by NVIDIA AI',
          iconURL:
            'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Nvidia_logo.svg/1200px-Nvidia_logo.svg.png',
        })
        .setTimestamp()

      // Add action buttons
      const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('tool_export')
          .setLabel('Exportar Resultado')
          .setEmoji('📤')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('tool_retry')
          .setLabel('Tentar Novamente')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('tool_copy')
          .setLabel('Copiar')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Secondary)
      )

      await msg.edit({ embeds: [resultEmbed], components: [buttons] })

      // Handle button interactions
      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000,
      })

      collector.on('collect', async (interaction: any) => {
        if (interaction.user.id !== ctx.author.id) {
          return interaction.reply({
            content: 'Apenas o autor pode usar esses botões!',
            flags: MessageFlags.Ephemeral,
          })
        }

        switch (interaction.customId) {
          case 'tool_export':
            const attachment = new AttachmentBuilder(
              Buffer.from(
                `# ${tool.name} - Resultado\n\n## Input:\n${input}\n\n## Output:\n${response}`
              ),
              { name: `${tool.name.replace(/\s/g, '_')}_${Date.now()}.md` }
            )
            await interaction.reply({
              files: [attachment],
              flags: MessageFlags.Ephemeral,
            })
            break

          case 'tool_retry':
            await interaction.deferUpdate()
            await this.executeTool(ctx, tool, input)
            break

          case 'tool_copy':
            // Create a code block for easy copying
            const codeBlock = '```\n' + response + '\n```'
            await interaction.reply({
              content: 'Resultado formatado para cópia:\n' + codeBlock,
              flags: MessageFlags.Ephemeral,
            })
            break
        }
      })
    } catch (error) {
      console.error('Tool execution error:', error)

      const errorEmbed = new EmbedBuilder()
        .setColor(this.client.config.color.red)
        .setTitle('❌ Erro ao executar ferramenta')
        .setDescription('Ocorreu um erro ao processar sua solicitação.')

      await msg.edit({ embeds: [errorEmbed], components: [] })
    }
  }
}
