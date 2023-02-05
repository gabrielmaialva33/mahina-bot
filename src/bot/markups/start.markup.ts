import { Menu } from '@grammyjs/menu'

import { Context } from '@/bot/types'

export const StartMarkup = new Menu<Context>('start')
  .text('🔎 Comandos', (ctx) => ctx.reply(`<b>Comandos</b>`))
  .row()
  .url('📺 Canal', 'https://t.me/clubdaswinxcanal')
  .url('👥 Grupo', 'https://t.me/polclubdaswinx')
  .row()
  .url('➕ Me adicione em seu grupo', 'https://t.me/MahinaMusicBot?startgroup=new')
  .row()
  .url('👔 Dono', 'https://t.me/mrootx')
