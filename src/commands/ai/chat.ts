import {
  ButtonInteraction,
  ComponentType,
  EmbedBuilder,
  Message,
  MessageFlags,
  ApplicationCommandOptionType,
} from 'discord.js'

import Command from '#common/command'
import {
  chatWithPreferredAI,
  getLastAIRoute,
  getPreferredAIService,
  resolveAIServiceForCapability,
  runCodeTask,
  runRagTask,
  runReasoningTask,
  setUserAIModel,
} from '#common/ai_runtime'
import {
  createChatButtons,
  createChatExportAttachment,
  createChatLoadingEmbed,
  createChatResponseEmbed,
  extractFormattedCodeAttachment,
  getChatModeColor,
  getChatSystemPrompt,
  resolveChatMode,
  splitChatResponse,
} from '#common/chat_runtime'
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

  public async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
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
      mode = resolveChatMode(args)

      const actualArgs = mode === 'chat' ? args : args.slice(1)
      prompt = actualArgs.join(' ')
    }

    if (!prompt) {
      return await ctx.sendMessage(t('cmd.chat.ui.errors.missing_prompt'))
    }

    // Check for vision mode requirements
    if (mode === 'vision' && !imageUrl) {
      return await ctx.sendMessage(t('cmd.chat.ui.errors.missing_image'))
    }

    // Get enhanced NVIDIA service
    const nvidiaService = getPreferredAIService(client)

    if (!nvidiaService) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: t('cmd.chat.ui.errors.service_unavailable'),
            color: client.config.color.red,
          },
        ],
      })
    }

    const loadingEmbed = createChatLoadingEmbed(
      this.client.config.color.violet,
      t,
      modelKey || t('cmd.chat.ui.default_model_label')
    )

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
      if (modelKey) {
        const modelSelection = setUserAIModel(client, userId, modelKey)
        if (!modelSelection.success) {
          const reason =
            modelSelection.error === 'model-not-found'
              ? t('cmd.chat.ui.errors.invalid_model', { model: modelKey })
              : t('cmd.chat.ui.errors.model_apply_failed')

          await msg.edit({
            embeds: [new EmbedBuilder().setColor(client.config.color.red).setDescription(reason)],
          })
          return
        }
      }

      // Build system prompt based on mode
      const systemPrompt = getChatSystemPrompt(mode, language)

      // Add conversation context
      const context = conversation
        .slice(-5)
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n')

      // Prepare options for enhanced service
      const options = {
        temperature: mode === 'code' ? 0.2 : mode === 'reasoning' ? 0.6 : 0.7,
        maxTokens: mode === 'reasoning' ? 4096 : 2048,
        images: imageUrl ? [imageUrl] : undefined,
      }

      // Use appropriate method based on mode
      let response: string

      if (mode === 'reasoning') {
        response = await runReasoningTask(client, userId, prompt, context)
      } else if (mode === 'analyze' || mode === 'debug') {
        response = await runCodeTask(client, userId, prompt, language || 'javascript', mode)
      } else if (mode === 'code') {
        const codeService = resolveAIServiceForCapability(client, 'code')
        if (codeService?.analyzeCode) {
          response = await runCodeTask(client, userId, prompt, language || 'javascript', 'explain')
        } else {
          response = await chatWithPreferredAI(client, {
            userId,
            message: prompt,
            context,
            systemPrompt,
            imageUrl,
            options,
          })
        }
      } else if (conversation.length > 0 && resolveAIServiceForCapability(client, 'rag')) {
        response = await runRagTask(client, userId, prompt)
      } else {
        response = await chatWithPreferredAI(client, {
          userId,
          message: prompt,
          context,
          systemPrompt,
          imageUrl,
          options,
        })
      }

      // Add to conversation history
      conversation.push({ role: 'user', content: prompt })
      conversation.push({ role: 'assistant', content: response })

      // Keep conversation history limited
      if (conversation.length > 20) {
        conversation.splice(0, conversation.length - 20)
      }

      // Format and send response
      await this.sendFormattedResponse(ctx, msg, response, mode, userId)

      // Add control buttons
      await msg.edit({ components: [createChatButtons(t, mode)] })

      // Handle button interactions
      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000, // 5 minutes
      })

      collector.on('collect', async (interaction: ButtonInteraction) => {
        if (interaction.user.id !== ctx.author?.id) {
          return interaction.reply({
            content: t('cmd.chat.ui.errors.button_author_only'),
            flags: MessageFlags.Ephemeral,
          })
        }

        switch (interaction.customId) {
          case 'ai_new_chat':
            this.conversations.delete(conversationKey)
            await interaction.reply({
              content: t('cmd.chat.ui.actions.new_chat_success'),
              flags: MessageFlags.Ephemeral,
            })
            break

          case 'ai_continue':
            await interaction.reply({
              content: t('cmd.chat.ui.actions.continue_success'),
              flags: MessageFlags.Ephemeral,
            })
            break

          case 'ai_code_format':
            await this.formatCodeResponse(ctx, interaction, response)
            break

          case 'ai_export':
            await this.exportResponse(ctx, interaction, response, mode)
            break
        }
      })
    } catch (error) {
      console.error('Error in chat command:', error)

      const errorEmbed = new EmbedBuilder()
        .setColor(this.client.config.color.red)
        .setTitle(t('cmd.chat.ui.errors.generic_title'))
        .setDescription(t('cmd.chat.ui.errors.generic'))
        .setFooter({ text: t('cmd.chat.ui.errors.generic_footer') })

      await msg.edit({ embeds: [errorEmbed], components: [] })
    }
  }

  private async sendFormattedResponse(
    ctx: Context,
    msg: Message,
    response: string,
    mode: string,
    userId: string
  ) {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const chunks = splitChatResponse(response, 4000)
    const route = getLastAIRoute(userId)
    const routeLabel = route ? `${route.provider} · ${route.model}` : undefined

    for (const [i, chunk] of chunks.entries()) {
      const embed = createChatResponseEmbed(
        getChatModeColor(
          {
            chat: this.client.config.color.main,
            code: this.client.config.color.green,
            analyze: this.client.config.color.yellow,
            explain: this.client.config.color.blue,
            debug: this.client.config.color.red,
            design: this.client.config.color.violet,
            vision: this.client.config.color.green,
            reasoning: this.client.config.color.main,
          },
          mode
        ),
        t,
        mode,
        chunk,
        i === 0,
        routeLabel
      )

      if (i === 0) {
        await msg.edit({ embeds: [embed] })
      } else {
        await ctx.sendMessage({ embeds: [embed] })
      }
    }
  }

  private async formatCodeResponse(ctx: Context, interaction: ButtonInteraction, response: string) {
    const attachment = extractFormattedCodeAttachment(response)

    if (!attachment) {
      return interaction.reply({
        content: ctx.locale('cmd.chat.ui.code.no_blocks'),
        flags: MessageFlags.Ephemeral,
      })
    }

    await interaction.reply({
      content: ctx.locale('cmd.chat.ui.code.formatted'),
      files: [attachment],
      flags: MessageFlags.Ephemeral,
    })
  }

  private async exportResponse(
    ctx: Context,
    interaction: ButtonInteraction,
    response: string,
    mode: string
  ) {
    const { filename, attachment } = createChatExportAttachment(response, mode)

    await interaction.reply({
      content: ctx.locale('cmd.chat.ui.export.success', { filename }),
      files: [attachment],
      flags: MessageFlags.Ephemeral,
    })
  }
}
