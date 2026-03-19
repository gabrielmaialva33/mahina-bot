import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'

export function ensureStreamRuntime(client: MahinaBot): string | null {
  if (!client.runtime.selfbot) {
    return 'Os comandos de stream estão desativados neste runtime.'
  }

  if (!client.selfbot?.isReady()) {
    return 'O runtime de stream ainda não está pronto. Ative o selfbot e tente novamente.'
  }

  return null
}

export async function ensureStreamCommandReady(client: MahinaBot, ctx: Context): Promise<boolean> {
  const runtimeError = ensureStreamRuntime(client)
  if (!runtimeError) {
    return true
  }

  await ctx.sendMessage({
    embeds: [
      {
        title: '🎥 Stream indisponível',
        description: runtimeError,
        color: client.config.color.red,
      },
    ],
  })

  return false
}
