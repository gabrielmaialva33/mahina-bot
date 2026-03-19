import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js'

type Translate = (key: string, params?: Record<string, unknown>) => string

export function resolveChatMode(args: string[]) {
  const modes = new Set(['code', 'analyze', 'explain', 'debug', 'design', 'vision', 'reasoning'])
  return modes.has(args[0]?.toLowerCase()) ? args[0].toLowerCase() : 'chat'
}

export function createChatLoadingEmbed(color: number, translate: Translate, modelLabel: string) {
  return new EmbedBuilder()
    .setColor(color)
    .setDescription(translate('cmd.chat.ui.loading', { model: modelLabel }))
    .setFooter({ text: translate('cmd.chat.ui.footer') })
}

export function getChatSystemPrompt(mode: string, language?: string) {
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

export function splitChatResponse(text: string, maxLength: number) {
  const chunks: string[] = []
  let currentChunk = ''

  for (const line of text.split('\n')) {
    if (currentChunk.length + line.length + 1 > maxLength) {
      chunks.push(currentChunk)
      currentChunk = line
    } else {
      currentChunk += `${currentChunk ? '\n' : ''}${line}`
    }
  }

  if (currentChunk) chunks.push(currentChunk)
  return chunks
}

export function getChatModeColor(colors: Record<string, number>, mode: string) {
  return colors[mode] || colors.chat || Object.values(colors)[0]
}

export function getChatModeEmoji(mode: string) {
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

export function createChatResponseEmbed(
  color: number,
  translate: Translate,
  mode: string,
  chunk: string,
  includeTitle = false,
  routeLabel?: string
) {
  const emoji = getChatModeEmoji(mode)
  const embed = new EmbedBuilder()
    .setColor(color)
    .setDescription(chunk)
    .setFooter({
      text: routeLabel
        ? `${translate('cmd.chat.ui.response.footer', {
            emoji,
            mode: mode.charAt(0).toUpperCase() + mode.slice(1),
          })} • ${routeLabel}`
        : translate('cmd.chat.ui.response.footer', {
            emoji,
            mode: mode.charAt(0).toUpperCase() + mode.slice(1),
          }),
    })

  if (includeTitle) {
    embed.setTitle(translate('cmd.chat.ui.response.title', { emoji }))
  }

  return embed
}

export function createChatButtons(translate: Translate, mode: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('ai_new_chat')
      .setLabel(translate('cmd.chat.ui.actions.new_chat'))
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ai_continue')
      .setLabel(translate('cmd.chat.ui.actions.continue'))
      .setEmoji('💬')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ai_code_format')
      .setLabel(translate('cmd.chat.ui.actions.format_code'))
      .setEmoji('📝')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!['code', 'analyze', 'debug'].includes(mode)),
    new ButtonBuilder()
      .setCustomId('ai_export')
      .setLabel(translate('cmd.chat.ui.actions.export'))
      .setEmoji('📤')
      .setStyle(ButtonStyle.Secondary)
  )
}

export function extractFormattedCodeAttachment(response: string) {
  const codeBlocks = response.match(/```[\s\S]*?```/g) || []
  if (codeBlocks.length === 0) return null

  let formattedCode = ''
  for (const block of codeBlocks) {
    formattedCode += `${block.replace(/```(\w+)?\n?/, '').replace(/```$/, '')}\n\n`
  }

  return new AttachmentBuilder(Buffer.from(formattedCode), { name: 'code.txt' })
}

export function createChatExportAttachment(response: string, mode: string) {
  const filename = `ai_${mode}_${Date.now()}.md`
  return {
    filename,
    attachment: new AttachmentBuilder(Buffer.from(response), { name: filename }),
  }
}
