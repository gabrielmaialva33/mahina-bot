import { Composer } from 'grammy'

import { Context } from '@/bot/types'

import start from '@/bot/commands/start.command'

const composer = new Composer<Context>()

composer.use(start)

export default composer
