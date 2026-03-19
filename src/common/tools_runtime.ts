import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js'

type Translate = (key: string, params?: Record<string, unknown>) => string

export interface AIToolDefinition {
  name: string
  description: string
  emoji: string
  systemPrompt: string
  examples: string[]
}

export function createDefaultAITools(): Map<string, AIToolDefinition> {
  return new Map([
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

export function findAITool(tools: Map<string, AIToolDefinition>, key: string) {
  if (tools.has(key)) {
    return tools.get(key)
  }

  for (const [toolKey, tool] of tools) {
    if (toolKey.includes(key) || tool.name.toLowerCase().includes(key)) {
      return tool
    }
  }

  return undefined
}

export function getAIToolKey(tools: Map<string, AIToolDefinition>, tool: AIToolDefinition): string {
  return Array.from(tools.entries()).find(([, currentTool]) => currentTool === tool)?.[0] || ''
}

export function createToolSelectorEmbed(
  color: number,
  translate: Translate,
  tools: Map<string, AIToolDefinition>
) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(translate('ai.tools.messages.select_tool'))
    .setDescription(translate('ai.tools.messages.select_description'))
    .setFooter({ text: translate('ai.tools.messages.footer') })

  for (const [key, tool] of tools) {
    embed.addFields({
      name: `${tool.emoji} ${tool.name}`,
      value: [
        tool.description,
        translate('ai.tools.messages.usage_line', { command: `!tools ${key} [input]` }),
      ].join('\n'),
      inline: true,
    })
  }

  return embed
}

export function createToolSelectorMenu(translate: Translate, tools: Map<string, AIToolDefinition>) {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('tool_selector')
      .setPlaceholder(translate('ai.tools.messages.selector_placeholder'))
      .addOptions(
        Array.from(tools.entries()).map(([key, tool]) => ({
          label: tool.name,
          description: tool.description.substring(0, 100),
          value: key,
          emoji: tool.emoji,
        }))
      )
  )
}

export function createToolHelpEmbed(
  color: number,
  translate: Translate,
  tool: AIToolDefinition,
  toolKey: string
) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`${tool.emoji} ${tool.name}`)
    .setDescription(tool.description)
    .addFields(
      {
        name: translate('ai.tools.messages.help_usage_title'),
        value: `!tools ${toolKey} [input]`,
      },
      {
        name: translate('ai.tools.messages.help_examples_title'),
        value: tool.examples.map((example) => `• ${example}`).join('\n'),
      }
    )
    .setFooter({ text: translate('ai.tools.messages.help_footer') })
}

export function createToolLoadingEmbed(
  color: number,
  translate: Translate,
  tool: AIToolDefinition
) {
  return new EmbedBuilder()
    .setColor(color)
    .setDescription(
      translate('ai.tools.messages.processing', { emoji: tool.emoji, name: tool.name })
    )
}

export function createToolResultEmbed(
  color: number,
  translate: Translate,
  tool: AIToolDefinition,
  response: string,
  routeLabel?: string
) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(translate('ai.tools.messages.result_title', { emoji: tool.emoji, name: tool.name }))
    .setDescription(response.length > 4000 ? `${response.substring(0, 4000)}...` : response)
    .setFooter({
      text: routeLabel
        ? `${translate('ai.tools.messages.footer')} · ${routeLabel}`
        : translate('ai.tools.messages.footer'),
      iconURL:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Nvidia_logo.svg/1200px-Nvidia_logo.svg.png',
    })
    .setTimestamp()
}

export function createToolButtons(translate: Translate) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('tool_export')
      .setLabel(translate('ai.tools.buttons.export'))
      .setEmoji('📤')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('tool_retry')
      .setLabel(translate('ai.tools.buttons.retry'))
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('tool_copy')
      .setLabel(translate('ai.tools.buttons.copy'))
      .setEmoji('📋')
      .setStyle(ButtonStyle.Secondary)
  )
}

export function createToolExportAttachment(
  translate: Translate,
  tool: AIToolDefinition,
  toolKey: string,
  input: string,
  response: string
) {
  return new AttachmentBuilder(
    Buffer.from(
      [
        `${tool.name} - ${translate('ai.tools.messages.export_title')}`,
        '',
        `${translate('ai.tools.messages.export_input')}:`,
        input,
        '',
        `${translate('ai.tools.messages.export_output')}:`,
        response,
      ].join('\n')
    ),
    { name: `${toolKey || 'tool'}_${Date.now()}.txt` }
  )
}

export function createToolCopyContent(translate: Translate, response: string) {
  return `${translate('ai.tools.messages.copy_ready')}\n\`\`\`\n${response}\n\`\`\``
}
