import { Composer } from 'grammy'

import { Context } from '@/bot/types'

import start from '@/bot/commands/start.command'
import ping from '@/bot/commands/ping.command'

const composer = new Composer<Context>()

composer.use(start)
composer.use(ping)

export default composer
