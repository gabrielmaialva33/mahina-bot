import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  Message,
  MessageFlags,
} from 'discord.js'

import Command from '#common/command'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'

export default class ChatCommand extends Command {
  private conversations: Map<string, Array<{ role: 'user' | 'assistant'; content: string }>> =
    new Map()

  constructor(client: MahinaBot) {
    super(client, {
      name: 'chat',
      description: {
        content: 'Chat inteligente com IA da NVIDIA - análise de código, geração e muito mais!',
        examples: [
          'chat Explique o que é React',
          'chat code Crie uma API REST em Python',
          'chat analyze {código}',
          'chat vision {imagem} O que você vê?',
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
            { name: '👁️ Análise de Imagem', value: 'vision' },
            { name: '🧠 Raciocínio Avançado', value: 'reasoning' },
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
        {
          name: 'model',
          description: 'Modelo de IA a usar',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '🌟 Llama 4 Maverick (Multimodal)', value: 'llama-4-maverick' },
            { name: '🧠 DeepSeek R1 (Raciocínio)', value: 'deepseek-r1' },
            { name: '💻 Qwen Coder (Código)', value: 'qwen-coder' },
            { name: '🚀 Nemotron Ultra (Premium)', value: 'nemotron-ultra' },
            { name: '⚡ Nemotron Nano (Rápido)', value: 'nemotron-nano' },
          ],
        },
        {
          name: 'image',
          description: 'URL da imagem para análise (modo vision)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    })
  }

  public async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    let mode: string
    let prompt: string
    let language: string | undefined
    let modelKey: string | undefined
    let imageUrl: string | undefined

    if (ctx.isInteraction) {
      mode = (ctx.options.get('mode')?.value as string) || 'chat'
      prompt = ctx.options.get('prompt')?.value as string
      language = ctx.options.get('language')?.value as string
      modelKey = ctx.options.get('model')?.value as string
      imageUrl = ctx.options.get('image')?.value as string
    } else {
      mode =
        args[0]?.toLowerCase() === 'code' ||
        args[0]?.toLowerCase() === 'analyze' ||
        args[0]?.toLowerCase() === 'explain' ||
        args[0]?.toLowerCase() === 'debug' ||
        args[0]?.toLowerCase() === 'design' ||
        args[0]?.toLowerCase() === 'vision' ||
        args[0]?.toLowerCase() === 'reasoning'
          ? args[0].toLowerCase()
          : 'chat'

      const actualArgs = mode === 'chat' ? args : args.slice(1)
      prompt = actualArgs.join(' ')
    }

    if (!prompt) {
      return await ctx.sendMessage('Por favor, forneça uma mensagem ou pergunta!')
    }

    // Check for vision mode requirements
    if (mode === 'vision' && !imageUrl) {
      return await ctx.sendMessage('Por favor, forneça uma URL de imagem para análise!')
    }

    // Get enhanced NVIDIA service
    const nvidiaService = client.services.nvidiaEnhanced || client.services.nvidia

    if (!nvidiaService) {
      return await ctx.sendMessage({
        embeds: [
          {
            description:
              '❌ Serviço de IA não está configurado. Configure NVIDIA_API_KEY no ambiente.',
            color: client.config.color.red,
          },
        ],
      })
    }

    const loadingEmbed = new EmbedBuilder()
      .setColor(this.client.config.color.violet)
      .setDescription(`🤖 **Processando com ${modelKey ? `modelo ${modelKey}` : 'IA NVIDIA'}...**`)
      .setFooter({ text: 'Powered by NVIDIA AI' })

    const msg = await ctx.sendMessage({ embeds: [loadingEmbed] })

    try {
      // Get user conversation history
      const userId = ctx.author!.id
      const conversationKey = `${userId}-${mode}`

      if (!this.conversations.has(conversationKey)) {
        this.conversations.set(conversationKey, [])
      }

      const conversation = this.conversations.get(conversationKey)!

      // Set user model if specified
      if (modelKey && nvidiaService.setUserModel) {
        nvidiaService.setUserModel(userId, modelKey)
      }

      // Build system prompt based on mode
      const systemPrompt = this.getSystemPrompt(mode, language)

      // Add conversation context
      const context = conversation
        .slice(-5)
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n')

      // Prepare options for enhanced service
      const options: any = {
        temperature: mode === 'code' ? 0.2 : mode === 'reasoning' ? 0.6 : 0.7,
        maxTokens: mode === 'reasoning' ? 4096 : 2048,
      }

      if (imageUrl) {
        options.images = [imageUrl]
      }

      // Use appropriate method based on mode
      let response: string

      if (mode === 'reasoning' && nvidiaService.reasoning) {
        // Use specialized reasoning method
        response = await nvidiaService.reasoning(userId, prompt, context)
      } else if (
        (mode === 'code' || mode === 'analyze' || mode === 'debug') &&
        nvidiaService.analyzeCode
      ) {
        // Use code analysis method
        response = await nvidiaService.analyzeCode(
          userId,
          prompt,
          language || 'javascript',
          mode as any
        )
      } else if (nvidiaService.generateWithRAG && conversation.length > 0) {
        // Use RAG for better context
        response = await nvidiaService.generateWithRAG(userId, prompt)
      } else {
        // Default chat method
        response = await nvidiaService.chat(userId, prompt, context, systemPrompt, options)
      }

      // Add to conversation history
      conversation.push({ role: 'user', content: prompt })
      conversation.push({ role: 'assistant', content: response })

      // Keep conversation history limited
      if (conversation.length > 20) {
        conversation.splice(0, conversation.length - 20)
      }

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
          .setDisabled(mode !== 'code' && mode !== 'analyze' && mode !== 'debug'),
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

      collector.on(
        'collect',
        async (interaction: {
          user: { id: any }
          reply: (arg0: { content: string; flags: any }) => any
          customId: any
        }) => {
          if (interaction.user.id !== ctx.author?.id) {
            return interaction.reply({
              content: 'Apenas o autor do comando pode usar esses botões!',
              flags: MessageFlags.Ephemeral,
            })
          }

          switch (interaction.customId) {
            case 'ai_new_chat':
              this.conversations.delete(conversationKey)
              await interaction.reply({
                content: '✅ Conversa reiniciada! Use o comando novamente para começar.',
                flags: MessageFlags.Ephemeral,
              })
              break

            case 'ai_continue':
              await interaction.reply({
                content: '💬 Digite sua próxima mensagem usando o comando!',
                flags: MessageFlags.Ephemeral,
              })
              break

            case 'ai_code_format':
              await this.formatCodeResponse(interaction, response)
              break

            case 'ai_export':
              await this.exportResponse(interaction, response, mode)
              break
          }
        }
      )
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

      vision: `Você é um especialista em análise de imagens e visão computacional.
               Analise imagens fornecidas e:
               - Descreva o que vê em detalhes
               - Identifique objetos, pessoas, texto ou elementos importantes
               - Forneça insights sobre composição, cores e contexto
               - Responda perguntas específicas sobre a imagem`,

      reasoning: `Você é um especialista em raciocínio lógico e resolução de problemas complexos.
                  Analise problemas passo a passo:
                  - Decomponha o problema em partes menores
                  - Identifique padrões e relações
                  - Use lógica dedutiva e indutiva
                  - Forneça soluções bem fundamentadas
                  - Considere múltiplas perspectivas`,
    }

    return basePrompts[mode as keyof typeof basePrompts] || basePrompts.chat
  }

  private async sendFormattedResponse(ctx: Context, msg: Message, response: string, mode: string) {
    // Split response if too long
    const chunks = this.splitResponse(response, 4000)

    for (const [i, chunk] of chunks.entries()) {
      const embed = new EmbedBuilder()
        .setColor(this.getModeColor(mode))
        .setDescription(chunk)
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
    const colors: Record<string, number> = {
      chat: this.client.config.color.main,
      code: this.client.config.color.green,
      analyze: this.client.config.color.yellow,
      explain: this.client.config.color.blue,
      debug: this.client.config.color.red,
      design: this.client.config.color.violet,
      vision: this.client.config.color.green,
      reasoning: this.client.config.color.main,
    }
    return colors[mode] || this.client.config.color.main
  }

  private getModeEmoji(mode: string): string {
    const emojis: Record<string, string> = {
      chat: '💬',
      code: '💻',
      analyze: '🔍',
      explain: '📚',
      debug: '🐛',
      design: '🎨',
      vision: '👁️',
      reasoning: '🧠',
    }
    return emojis[mode] || '🤖'
  }

  private async formatCodeResponse(interaction: any, response: string) {
    // Extract code blocks from response
    const codeBlocks = response.match(/```[\s\S]*?```/g) || []

    if (codeBlocks.length === 0) {
      return interaction.reply({
        content: 'Nenhum bloco de código encontrado na resposta!',
        flags: MessageFlags.Ephemeral,
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
      flags: MessageFlags.Ephemeral,
    })
  }

  private async exportResponse(interaction: any, response: string, mode: string) {
    const filename = `ai_${mode}_${Date.now()}.md`
    const attachment = new AttachmentBuilder(Buffer.from(response), { name: filename })

    await interaction.reply({
      content: `📤 Resposta exportada como **${filename}**`,
      files: [attachment],
      flags: MessageFlags.Ephemeral,
    })
  }
}
