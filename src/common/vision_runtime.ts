import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js'

export type VisionMode = 'analyze' | 'describe' | 'ocr' | 'art' | 'detect' | 'technical' | 'custom'

type Translate = (key: string, params?: Record<string, unknown>) => string

interface VisionAttachmentLike {
  contentType?: string
  height?: number | null
  name?: string | null
  size: number
  url: string
  width?: number | null
}

export function determineVisionMode(arg?: string): VisionMode {
  const modes: VisionMode[] = ['analyze', 'describe', 'ocr', 'art', 'detect', 'technical']

  if (!arg) return 'describe'

  const lowerArg = arg.toLowerCase()
  return modes.find((mode) => mode.startsWith(lowerArg)) || 'custom'
}

export function getVisionSystemPrompt(mode: VisionMode): string {
  const prompts: Record<VisionMode, string> = {
    analyze: `Você é um analisador de imagens especialista. Forneça uma análise detalhada incluindo:
    - Conteúdo principal da imagem
    - Elementos visuais importantes
    - Cores dominantes
    - Composição e estilo
    - Contexto e possível propósito`,
    describe: `Descreva a imagem de forma clara e detalhada.
    Seja objetivo mas completo, mencionando todos os elementos importantes visíveis.`,
    ocr: `Extraia e transcreva todo o texto visível na imagem.
    Organize o texto de forma lógica e indique a localização quando relevante.
    Se não houver texto, indique claramente.`,
    art: `Analise a imagem do ponto de vista artístico:
    - Estilo artístico
    - Técnicas utilizadas
    - Composição
    - Uso de cores e luz
    - Impacto emocional
    - Possível significado ou mensagem`,
    detect: `Identifique e liste todos os objetos, pessoas e elementos na imagem.
    Para cada item detectado, indique:
    - O que é
    - Localização aproximada
    - Características notáveis`,
    technical: `Forneça uma análise técnica da imagem:
    - Resolução estimada
    - Qualidade da imagem
    - Tipo de imagem (foto, ilustração, screenshot, etc)
    - Possíveis edições ou manipulações
    - Metadados visíveis`,
    custom: 'Responda à pergunta do usuário sobre a imagem de forma precisa e útil.',
  }

  return prompts[mode]
}

export function getVisionDefaultPrompt(mode: VisionMode): string {
  const prompts: Record<Exclude<VisionMode, 'custom'>, string> = {
    analyze: 'Faça uma análise completa desta imagem.',
    describe: 'Descreva o que você vê nesta imagem.',
    ocr: 'Extraia todo o texto presente nesta imagem.',
    art: 'Analise esta imagem do ponto de vista artístico.',
    detect: 'Identifique todos os objetos e pessoas nesta imagem.',
    technical: 'Faça uma análise técnica desta imagem.',
  }

  if (mode === 'custom') return 'O que você pode me dizer sobre esta imagem?'
  return prompts[mode]
}

export function createVisionLoadingEmbed(
  color: number,
  translate: Translate,
  attachment: VisionAttachmentLike
) {
  return new EmbedBuilder()
    .setColor(color)
    .setDescription(translate('ai.vision.messages.analyzing'))
    .setThumbnail(attachment.url)
    .setFooter({ text: translate('ai.vision.messages.footer') })
}

export function getVisionModeInfo(translate: Translate, mode: VisionMode) {
  const modeInfo: Record<VisionMode, { emoji: string; title: string }> = {
    analyze: { emoji: '🔍', title: translate('ai.vision.modes.analyze.title') },
    describe: { emoji: '📝', title: translate('ai.vision.modes.describe.title') },
    ocr: { emoji: '📄', title: translate('ai.vision.modes.ocr.title') },
    art: { emoji: '🎨', title: translate('ai.vision.modes.art.title') },
    detect: { emoji: '👥', title: translate('ai.vision.modes.detect.title') },
    technical: { emoji: '📊', title: translate('ai.vision.modes.technical.title') },
    custom: { emoji: '💬', title: translate('ai.vision.modes.custom.title') },
  }

  return modeInfo[mode]
}

export function formatVisionFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`
}

export function createVisionResultEmbed(
  color: number,
  translate: Translate,
  response: string,
  mode: VisionMode,
  attachment: VisionAttachmentLike
) {
  const info = getVisionModeInfo(translate, mode)

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${info.emoji} ${info.title}`)
    .setDescription(response.length > 4000 ? `${response.substring(0, 4000)}...` : response)
    .setThumbnail(attachment.url)
    .setFooter({
      text: translate('ai.vision.messages.footer'),
      iconURL:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Nvidia_logo.svg/1200px-Nvidia_logo.svg.png',
    })
    .setTimestamp()

  if (mode === 'technical' || mode === 'analyze') {
    embed.addFields(
      {
        name: translate('ai.vision.metadata.dimensions'),
        value: `${attachment.width}x${attachment.height}`,
        inline: true,
      },
      {
        name: translate('ai.vision.metadata.size'),
        value: formatVisionFileSize(attachment.size),
        inline: true,
      },
      {
        name: translate('ai.vision.metadata.type'),
        value: attachment.contentType || translate('ai.vision.messages.unknown_type'),
        inline: true,
      }
    )
  }

  return embed
}

export function createVisionButtons(translate: Translate) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('vision_reanalyze')
      .setLabel(translate('ai.vision.buttons.reanalyze'))
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('vision_export')
      .setLabel(translate('ai.vision.buttons.export'))
      .setEmoji('📤')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('vision_modes')
      .setLabel(translate('ai.vision.buttons.modes'))
      .setEmoji('🔧')
      .setStyle(ButtonStyle.Secondary)
  )
}

export function createVisionExportAttachment(
  translate: Translate,
  mode: VisionMode,
  attachment: VisionAttachmentLike,
  response: string
) {
  const info = getVisionModeInfo(translate, mode)
  const exportContent = [
    `${translate('ai.vision.messages.export_title')} - ${info.title}`,
    '',
    `${translate('ai.vision.messages.export_date')}: ${new Date().toLocaleString('pt-BR')}`,
    `${translate('ai.vision.messages.export_image')}: ${attachment.name || translate('ai.vision.messages.no_name')}`,
    `${translate('ai.vision.metadata.dimensions')}: ${attachment.width}x${attachment.height}`,
    `${translate('ai.vision.metadata.size')}: ${formatVisionFileSize(attachment.size)}`,
    '',
    `${translate('ai.vision.messages.export_result')}:`,
    response,
  ].join('\n')

  return new AttachmentBuilder(Buffer.from(exportContent), {
    name: `analise_imagem_${Date.now()}.txt`,
  })
}

export function createVisionModesEmbed(color: number, translate: Translate) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(translate('ai.vision.messages.available_modes'))
    .setDescription(translate('ai.vision.messages.mode_usage'))
    .addFields(
      { name: '🔍 analyze', value: translate('ai.vision.mode_descriptions.analyze'), inline: true },
      {
        name: '📝 describe',
        value: translate('ai.vision.mode_descriptions.describe'),
        inline: true,
      },
      { name: '📄 ocr', value: translate('ai.vision.mode_descriptions.ocr'), inline: true },
      { name: '🎨 art', value: translate('ai.vision.mode_descriptions.art'), inline: true },
      { name: '👥 detect', value: translate('ai.vision.mode_descriptions.detect'), inline: true },
      {
        name: '📊 technical',
        value: translate('ai.vision.mode_descriptions.technical'),
        inline: true,
      }
    )
}

export function createVisionHelpEmbed(color: number, translate: Translate) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(translate('ai.vision.messages.help_title'))
    .setDescription(translate('ai.vision.messages.help_description'))
    .addFields(
      {
        name: translate('ai.vision.messages.how_to_use'),
        value: translate('ai.vision.messages.how_to_steps'),
      },
      {
        name: translate('ai.vision.messages.available_modes'),
        value: [
          `• !vision - ${translate('ai.vision.mode_descriptions.describe')}`,
          `• !vision analyze - ${translate('ai.vision.mode_descriptions.analyze')}`,
          `• !vision ocr - ${translate('ai.vision.mode_descriptions.ocr')}`,
          `• !vision art - ${translate('ai.vision.mode_descriptions.art')}`,
          `• !vision detect - ${translate('ai.vision.mode_descriptions.detect')}`,
          `• !vision technical - ${translate('ai.vision.mode_descriptions.technical')}`,
        ].join('\n'),
      },
      {
        name: translate('ai.vision.messages.custom_questions'),
        value: translate('ai.vision.messages.custom_examples'),
      }
    )
    .setFooter({ text: translate('ai.vision.messages.attach_image') })
}
