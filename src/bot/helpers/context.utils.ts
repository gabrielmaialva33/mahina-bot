import { Context } from '@/bot/types'

export const ContextUtils = {
  get_username: (ctx: Context) => {
    if (ctx.from?.username) return ctx.from.username
    if (ctx.from?.first_name) return ctx.from.first_name
    return 'Unknown'
  },
}
