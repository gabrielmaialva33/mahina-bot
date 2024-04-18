import process from 'node:process'
import fs from 'node:fs'

import { StringUtils } from '#utils/string.utils'

export const HistoryUtils = {
  build_gpt_history: (input: string, output: string, reply_username: string): string => {
    const io = input.replace(`\nMaggie(${reply_username}):||`, '')
    return `${io}Maggie(${reply_username}):||${output}||\n`
  },

  build_reply_gpt_history: (input: string, output: string, reply_username: string): string => {
    const io = input.replace(`\nMaggie(${reply_username}):||`, '')
    return `${io}Maggie(${reply_username}):||${output}||\n`
  },

  build_gpt: (output: string): string => {
    return `Maggie:||${output}||\n`
  },

  build_chat_history: ({ text, username, reply_to_username }: ContextArgs): string => {
    if (reply_to_username) return `${username}(${reply_to_username}):||${text}||\n`
    return `${username}:||${text}||\n`
  },

  write_history: (history: string): void => {
    const historyFilePath = process.cwd() + '/tmp/history.gpt.txt'
    if (fs.existsSync(historyFilePath)) {
      const main = fs.readFileSync(process.cwd() + '/tmp/main.gpt.txt', 'utf8')
      const file = fs.readFileSync(historyFilePath, 'utf8')
      const prompt = StringUtils.RemoveBreakLines(main + file)
      if (StringUtils.CountTokens(prompt) > 3096) HistoryUtils.slice_lines(2)
    }

    fs.createWriteStream(historyFilePath, { flags: 'a' }).write(history)
  },

  write_context: (context: string): void => {
    const contextFilePath = process.cwd() + '/tmp/context.gpt.txt'
    fs.writeFileSync(contextFilePath, context)

    const main = fs.readFileSync(process.cwd() + '/tmp/main.gpt.txt', 'utf8')
    const file = fs.readFileSync(contextFilePath, 'utf8')
    const prompt = StringUtils.RemoveBreakLines(main + file)
    if (StringUtils.CountTokens(prompt) > 3000) HistoryUtils.slice_lines(2)
  },

  slice_lines: (n: number): void => {
    const historyFilePath = process.cwd() + '/tmp/history.gpt.txt'
    if (!fs.existsSync(historyFilePath)) return
    const lines = fs.readFileSync(historyFilePath, 'utf8').split('\n')
    fs.writeFileSync(historyFilePath, lines.slice(n).join('\n'))
  },

  reset_history: (): void => {
    const historyFilePath = process.cwd() + '/tmp/history.gpt.txt'
    const isExists = fs.existsSync(historyFilePath)
    if (isExists) fs.unlinkSync(historyFilePath)

    setTimeout(() => {
      fs.createWriteStream(historyFilePath, { flags: 'a' }).write('')
    }, 1000)
  },
}

export interface ContextArgs {
  username: string
  reply_to_username?: string
  text: string
  reply_to_text?: string
}
