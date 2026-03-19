type Translate = (key: string, params?: Record<string, unknown>) => string

export function createStreamCompletionEmbed(
  translate: Translate,
  modelName: string,
  tokenCount: number,
  providerName?: string
) {
  return {
    title: translate('cmd.stream.ui.complete.title'),
    fields: [
      { name: translate('cmd.stream.ui.complete.model'), value: modelName, inline: true },
      ...(providerName
        ? [
            {
              name: translate('cmd.stream.ui.complete.provider'),
              value: providerName,
              inline: true,
            },
          ]
        : []),
      {
        name: translate('cmd.stream.ui.complete.tokens'),
        value: `~${tokenCount}`,
        inline: true,
      },
    ],
    color: 0x76b900,
    timestamp: new Date().toISOString(),
  }
}
