import { Role } from '@/models/user.model'
import { Context, ContextScopeWith } from '@/bot/types'

export const isOwner = <C extends Context>(ctx: C): ctx is C & ContextScopeWith<'user'> =>
  ctx.scope.user?.role === Role.OWNER
