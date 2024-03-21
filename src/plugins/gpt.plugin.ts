import fs from 'node:fs'

import { DateTime } from 'luxon'
import { OpenAI } from 'openai'
import { CompletionCreateParamsBase } from 'openai/src/resources/completions.js'

import { env } from '#src/env'
import { StringUtils } from '#utils/string.utils'

import { Logger } from '#src/lib/logger'

export class AI extends OpenAI {
  private config = {
    model: 'gpt-3.5-turbo-instruct',
    //model: 'text-davinci-002',
    temperature: 0.7,
    max_tokens: 512,
    frequency_penalty: 0.5,
    presence_penalty: 0.9,
    n: 1,
    stop: ['||'],
  } as CompletionCreateParamsBase

  private logger: Logger

  constructor() {
    super({ apiKey: env.OPENAI_API_KEY })
    this.logger = new Logger()
  }

  async complete(text: string, username: string) {
    const tempMain = fs.readFileSync(process.cwd() + '/tmp/main.gpt.txt', 'utf8')
    const history = fs.readFileSync(process.cwd() + '/tmp/history.gpt.txt', 'utf8')

    const main = tempMain
      .replace(
        '$date',
        DateTime.local({ zone: 'America/Sao_Paulo' }).toLocaleString(DateTime.DATE_FULL)
      )
      .replace(
        '$time',
        DateTime.local({ zone: 'America/Sao_Paulo' }).toLocaleString(DateTime.TIME_SIMPLE)
      )

    this.logger.info(
      `context: ${JSON.stringify(StringUtils.InfoText(main + history + text))}`,
      'ai.complete'
    )

    const prompt = StringUtils.RemoveBreakLines(main + history + text + `Winx(${username}):||`)

    if (StringUtils.CountTokens(prompt) > 4096) {
      this.logger.error('tokens limit exceeded!', 'ai.complete')

      //await HistoryUtils.populate_history()
      return this.completions.create({ ...this.config, prompt }, { timeout: 30000 })
    }

    return this.completions.create({ ...this.config, prompt }, { timeout: 30000 })
  }
}
