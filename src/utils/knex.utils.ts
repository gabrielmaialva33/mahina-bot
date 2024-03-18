import { Knex } from 'knex'
import { Logger } from '#src/lib/logger'

type LogMessage = {
  sql?: string
  bindings?: unknown[]
  level: LogLevels
}

export enum LogLevels {
  DEBUG = 'debug',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * -------------------------------------------------------
 * KnexUtils
 * -------------------------------------------------------
 * KnexUtils is a collection of utilities for Knex.
 */
export const KnexUtils = {
  formatSql: (sql: string | undefined, bindings: unknown[] | undefined): string => {
    if (!sql) return ''
    if (!bindings) return sql

    let index = 0
    try {
      return sql.replace(/\?/g, () => {
        const binding = bindings[index++]
        if (typeof binding === 'string') {
          return `'${binding}'`
        }
        return String(binding)
      })
    } catch (error) {
      return `Error in formatting SQL: ${error}`
    }
  },
}

const logger = new Logger()

const logMessage = (message: LogMessage) => {
  const formattedMessage = message.sql
    ? KnexUtils.formatSql(message.sql, message.bindings)
    : message
  logger[message.level](formattedMessage)
}

export const KnexLogger: Knex.Logger = {
  debug: (message: LogMessage | LogMessage[]) => {
    if (Array.isArray(message)) message.forEach((m) => logMessage({ ...m, level: LogLevels.DEBUG }))
    else logMessage({ ...message, level: LogLevels.DEBUG })
  },
  error: (message: LogMessage | LogMessage[]) => {
    if (Array.isArray(message)) message.forEach((m) => logMessage({ ...m, level: LogLevels.ERROR }))
    else logMessage({ ...message, level: LogLevels.ERROR })
  },
  warn: (message: LogMessage | LogMessage[]) => {
    if (Array.isArray(message)) message.forEach((m) => logMessage({ ...m, level: LogLevels.WARN }))
    else logMessage({ ...message, level: LogLevels.WARN })
  },
  enableColors: true,
}
