import {
  CommandInteraction,
  Message,
  EmbedBuilder,
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  AttachmentBuilder,
  InteractionResponseFlags,
} from 'discord.js'
import OpenAI from 'openai'
import Command from '#common/command'
import type { Context, MahinaBot } from '#common/index'

export default class ChatCommand extends Command {
  private openai: OpenAI
  private conversations: Map<string, Array<{ role: string; content: string }>> = new Map()

  constructor(client: MahinaBot) {
    super(client, {
      name: 'chat',
      description: {
        content: 'Chat inteligente com IA da NVIDIA - análise de código, geração e muito mais!',
        examples: [
          'chat Explique o que é React',
          'chat code Crie uma API REST em Python',
          'chat analyze {código}',
        ],
        usage: 'chat [mode] <mensagem>',
      },
      category: 'ai',
      aliases: ['ai', 'nvidia', 'gpt'],
      cooldown: 3,
      args: true,
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
          name: 'mode',
          description: 'Modo de operação da IA',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '💬 Chat Normal', value: 'chat' },
            { name: '💻 Geração de Código', value: 'code' },
            { name: '🔍 Análise de Código', value: 'analyze' },
            { name: '📚 Tutorial/Explicação', value: 'explain' },
            { name: '🐛 Debug de Código', value: 'debug' },
            { name: '🎨 UI/UX Helper', value: 'design' },
          ],
        },
        {
          name: 'prompt',
          description: 'Sua mensagem ou pergunta',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'language',
          description: 'Linguagem de programação (para modos de código)',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: 'JavaScript/TypeScript', value: 'javascript' },
            { name: 'Python', value: 'python' },
            { name: 'Java', value: 'java' },
            { name: 'C++', value: 'cpp' },
            { name: 'Go', value: 'go' },
            { name: 'Rust', value: 'rust' },
            { name: 'SQL', value: 'sql' },
            { name: 'HTML/CSS', value: 'web' },
          ],
        },
      ],
    })

    // Initialize NVIDIA API
    this.openai = new OpenAI({
      apiKey:
        process.env.NVIDIA_API_KEY ||
        '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',
      baseURL: 'https://integrate.api.nvidia.com/v1',
    })
  }

  public async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const mode =
      args[0]?.toLowerCase() === 'code' ||
      args[0]?.toLowerCase() === 'analyze' ||
      args[0]?.toLowerCase() === 'explain' ||
      args[0]?.toLowerCase() === 'debug' ||
      args[0]?.toLowerCase() === 'design'
        ? args[0].toLowerCase()
        : 'chat'

    const actualArgs = mode === 'chat' ? args : args.slice(1)
    const prompt = actualArgs.join(' ')

    if (!prompt) {
      return await ctx.sendMessage('Por favor, forneça uma mensagem ou pergunta!')
    }

    const loadingEmbed = new EmbedBuilder()
      .setColor(this.client.config.color.violet)
      .setDescription('🤖 **Processando sua solicitação...**')
      .setFooter({ text: 'Powered by NVIDIA AI' })

    const msg = await ctx.sendMessage({ embeds: [loadingEmbed] })

    try {
      // Get user conversation history
      const userId = ctx.author.id
      const conversationKey = `${userId}-${mode}`

      if (!this.conversations.has(conversationKey)) {
        this.conversations.set(conversationKey, [])
      }

      const conversation = this.conversations.get(conversationKey)!

      // Build system prompt based on mode
      const systemPrompt = this.getSystemPrompt(mode, ctx.args?.language)

      // Add user message
      conversation.push({ role: 'user', content: prompt })

      // Keep conversation history limited
      if (conversation.length > 10) {
        conversation.splice(0, conversation.length - 10)
      }

      // Create messages array with system prompt
      const messages = [{ role: 'system', content: systemPrompt }, ...conversation]

      // Call NVIDIA API
      const completion = await this.openai.chat.completions.create({
        model: 'meta/llama-3.1-405b-instruct',
        messages,
        temperature: mode === 'code' ? 0.2 : 0.7,
        top_p: 0.9,
        max_tokens: 2048,
        stream: false,
      })

      const response =
        completion.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.'

      // Add assistant response to conversation
      conversation.push({ role: 'assistant', content: response })

      // Format and send response
      await this.sendFormattedResponse(ctx, msg, response, mode)

      // Add control buttons
      const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('ai_new_chat')
          .setLabel('Nova Conversa')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('ai_continue')
          .setLabel('Continuar')
          .setEmoji('💬')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('ai_code_format')
          .setLabel('Formatar Código')
          .setEmoji('📝')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(mode !== 'code' && mode !== 'analyze'),
        new ButtonBuilder()
          .setCustomId('ai_export')
          .setLabel('Exportar')
          .setEmoji('📤')
          .setStyle(ButtonStyle.Secondary)
      )

      await msg.edit({ components: [buttons] })

      // Handle button interactions
      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000, // 5 minutes
      })

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== ctx.author.id) {
          return interaction.reply({
            content: 'Apenas o autor do comando pode usar esses botões!',
            flags: InteractionResponseFlags.Ephemeral,
          })
        }

        switch (interaction.customId) {
          case 'ai_new_chat':
            this.conversations.delete(conversationKey)
            await interaction.reply({
              content: '✅ Conversa reiniciada! Use o comando novamente para começar.',
              flags: InteractionResponseFlags.Ephemeral,
            })
            break

          case 'ai_continue':
            await interaction.reply({
              content: '💬 Digite sua próxima mensagem usando o comando!',
              flags: InteractionResponseFlags.Ephemeral,
            })
            break

          case 'ai_code_format':
            await this.formatCodeResponse(interaction, response)
            break

          case 'ai_export':
            await this.exportResponse(interaction, response, mode)
            break
        }
      })
    } catch (error) {
      console.error('Error in chat command:', error)

      const errorEmbed = new EmbedBuilder()
        .setColor(this.client.config.color.red)
        .setTitle('❌ Erro')
        .setDescription('Ocorreu um erro ao processar sua solicitação.')
        .setFooter({ text: 'Tente novamente mais tarde' })

      await msg.edit({ embeds: [errorEmbed], components: [] })
    }
  }

  private getSystemPrompt(mode: string, language?: string): string {
    const basePrompts = {
      chat: `Você é um assistente inteligente e amigável. Responda de forma clara, útil e concisa. 
             Use markdown para formatar suas respostas quando apropriado.`,

      code: `Você é um expert em programação${language ? ` especializado em ${language}` : ''}. 
             Gere código limpo, eficiente e bem comentado. 
             Sempre formate o código em blocos markdown com syntax highlighting.
             Inclua explicações breves sobre partes importantes do código.`,

      analyze: `Você é um analisador de código experiente. 
                Analise o código fornecido identificando:
                - Possíveis bugs ou problemas
                - Melhorias de performance
                - Boas práticas não seguidas
                - Sugestões de refatoração
                Seja construtivo e educativo em suas análises.`,

      explain: `Você é um professor de programação paciente e didático. 
                Explique conceitos de forma clara e progressiva.
                Use analogias quando apropriado.
                Inclua exemplos de código simples para ilustrar conceitos.
                Divida explicações complexas em passos menores.`,

      debug: `Você é um debugger especialista. 
              Analise o código ou erro fornecido e:
              - Identifique a causa raiz do problema
              - Explique por que o erro está ocorrendo
              - Forneça soluções passo a passo
              - Sugira como prevenir erros similares no futuro`,

      design: `Você é um especialista em UI/UX e front-end. 
               Forneça sugestões de design, melhores práticas de interface,
               e código para componentes visuais modernos e acessíveis.
               Considere responsividade e experiência do usuário.`,
    }

    return basePrompts[mode] || basePrompts.chat
  }

  private async sendFormattedResponse(ctx: Context, msg: Message, response: string, mode: string) {
    // Split response if too long
    const chunks = this.splitResponse(response, 4000)

    for (let i = 0; i < chunks.length; i++) {
      const embed = new EmbedBuilder()
        .setColor(this.getModeColor(mode))
        .setDescription(chunks[i])
        .setFooter({
          text: `${this.getModeEmoji(mode)} ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode | Powered by NVIDIA`,
          iconURL:
            'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Nvidia_logo.svg/1200px-Nvidia_logo.svg.png',
        })

      if (i === 0) {
        embed.setTitle(`${this.getModeEmoji(mode)} Resposta da IA`)
        await msg.edit({ embeds: [embed] })
      } else {
        await ctx.sendMessage({ embeds: [embed] })
      }
    }
  }

  private splitResponse(text: string, maxLength: number): string[] {
    const chunks: string[] = []
    let currentChunk = ''

    const lines = text.split('\n')
    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > maxLength) {
        chunks.push(currentChunk)
        currentChunk = line
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk)
    }

    return chunks
  }

  private getModeColor(mode: string): number {
    const colors = {
      chat: this.client.config.color.main,
      code: this.client.config.color.green,
      analyze: this.client.config.color.yellow,
      explain: this.client.config.color.blue,
      debug: this.client.config.color.red,
      design: this.client.config.color.violet,
    }
    return colors[mode] || this.client.config.color.main
  }

  private getModeEmoji(mode: string): string {
    const emojis = {
      chat: '💬',
      code: '💻',
      analyze: '🔍',
      explain: '📚',
      debug: '🐛',
      design: '🎨',
    }
    return emojis[mode] || '🤖'
  }

  private async formatCodeResponse(interaction: any, response: string) {
    // Extract code blocks from response
    const codeBlocks = response.match(/```[\s\S]*?```/g) || []

    if (codeBlocks.length === 0) {
      return interaction.reply({
        content: 'Nenhum bloco de código encontrado na resposta!',
        flags: InteractionResponseFlags.Ephemeral,
      })
    }

    let formattedCode = ''
    for (const block of codeBlocks) {
      const cleanBlock = block.replace(/```(\w+)?\n?/, '').replace(/```$/, '')
      formattedCode += cleanBlock + '\n\n'
    }

    const attachment = new AttachmentBuilder(Buffer.from(formattedCode), { name: 'code.txt' })

    await interaction.reply({
      content: '📝 Código extraído e formatado:',
      files: [attachment],
      flags: InteractionResponseFlags.Ephemeral,
    })
  }

  private async exportResponse(interaction: any, response: string, mode: string) {
    const filename = `ai_${mode}_${Date.now()}.md`
    const attachment = new AttachmentBuilder(Buffer.from(response), { name: filename })

    await interaction.reply({
      content: `📤 Resposta exportada como **${filename}**`,
      files: [attachment],
      flags: InteractionResponseFlags.Ephemeral,
    })
  }
}
