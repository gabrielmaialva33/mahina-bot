import { Collection, type GuildMember, type PermissionResolvable } from 'discord.js'

import type MahinaBot from '#common/mahina_bot'

export type CommandDomain = 'ai' | 'music' | 'stream' | 'core'

export function getCommandDomain(category: string): CommandDomain {
  if (category === 'ai') return 'ai'
  if (['music', 'filters', 'playlist'].includes(category)) return 'music'
  if (category === 'stream') return 'stream'
  return 'core'
}

export function isCommandCategoryEnabled(client: MahinaBot, category: string): boolean {
  const domain = getCommandDomain(category)

  if (domain === 'ai') return client.runtime.ai
  if (domain === 'music') return client.runtime.music
  if (domain === 'stream') return client.runtime.selfbot

  return true
}

export function getMissingClientPermissions(
  member: GuildMember,
  permissions: PermissionResolvable[]
): PermissionResolvable[] {
  return permissions.filter((permission) => !member.permissions.has(permission))
}

export function hasDjAccess(member: GuildMember, djRoles: string[], isDev = false): boolean {
  if (isDev) return true

  const hasManageGuild = member.permissions.has('ManageGuild')
  const hasDjRole = member.roles.cache.some((role) => djRoles.includes(role.id))

  return hasManageGuild || hasDjRole
}

export function getCooldownTimeLeft(
  cooldowns: Collection<string, Collection<string, number>>,
  key: string,
  userId: string,
  cooldownSeconds: number
): number | null {
  if (!cooldowns.has(key)) {
    cooldowns.set(key, new Collection())
  }

  const now = Date.now()
  const timestamps = cooldowns.get(key)!
  const cooldownAmount = cooldownSeconds * 1000

  if (timestamps.has(userId)) {
    const expirationTime = timestamps.get(userId)! + cooldownAmount
    const timeLeft = (expirationTime - now) / 1000

    if (now < expirationTime && timeLeft > 0.9) {
      return timeLeft
    }
  }

  timestamps.set(userId, now)
  setTimeout(() => timestamps.delete(userId), cooldownAmount)

  return null
}
