import '@/libs/orm/objection.orm'

import { Bot } from '@/bot/core'

const Mahina = new Bot()

;(async () => {
  await Mahina.start()
})()
