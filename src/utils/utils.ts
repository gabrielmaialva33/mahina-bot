import {
  ActionRowBuilder,
  ActivityType,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  TextChannel,
} from 'discord.js'

import { BaseClient, Context } from '#common/index'

export class Utils {
  static formatTime(ms: number): string {
    const minuteMs = 60 * 1000
    const hourMs = 60 * minuteMs
    const dayMs = 24 * hourMs
    if (ms < minuteMs) {
      return `${ms / 1000}s`
    } else if (ms < hourMs) {
      return `${Math.floor(ms / minuteMs)}m ${Math.floor((ms % minuteMs) / 1000)}s`
    } else if (ms < dayMs) {
      return `${Math.floor(ms / hourMs)}h ${Math.floor((ms % hourMs) / minuteMs)}m`
    } else {
      return `${Math.floor(ms / dayMs)}d ${Math.floor((ms % dayMs) / hourMs)}h`
    }
  }

  static updateStatus(client: BaseClient, guildId?: string): void {
    // todo: add status per guild
    if (client.user && guildId) {
      const player = client.queue.get(guildId)
      if (player && player.current) {
        client.user.setActivity({
          name: `🎶 | ${player.current.info.title}`,
          type: ActivityType.Listening,
        })
      } else {
        client.user?.setPresence({
          activities: [
            {
              name: client.env.BOT_ACTIVITY,
              type: client.env.BOT_ACTIVITY_TYPE,
            },
          ],
          status: client.env.BOT_STATUS as any,
        })
      }
    }
  }

  static chunk(array: any[], size: number): any[] {
    const chunkedArr = []
    let index = 0
    while (index < array.length) {
      chunkedArr.push(array.slice(index, size + index))
      index += size
    }
    return chunkedArr
  }

  static formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const dm: number = decimals < 0 ? 0 : decimals
    const sizes: string[] = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i: number = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  static formatNumber(number: number): string {
    return number.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
  }

  static parseTime(string: string): number {
    const time = string.match(/([0-9]+[d,h,m,s])/g)
    if (!time) return 0
    let ms = 0
    for (const t of time) {
      const unit = t[t.length - 1]
      const amount = Number(t.slice(0, -1))
      if (unit === 'd') ms += amount * 24 * 60 * 60 * 1000
      else if (unit === 'h') ms += amount * 60 * 60 * 1000
      else if (unit === 'm') ms += amount * 60 * 1000
      else if (unit === 's') ms += amount * 1000
    }
    return ms
  }

  static progressBar(current: number, total: number, size = 20): string {
    const percent = Math.round((current / total) * 100)
    const filledSize = Math.round((size * current) / total)
    const emptySize = size - filledSize
    const filledBar = '▓'.repeat(filledSize)
    const emptyBar = '░'.repeat(emptySize)
    return `${filledBar}${emptyBar} ${percent}%`
  }

  static async paginate(ctx: Context, embed: any[]): Promise<void> {
    if (embed.length < 2) {
      if (ctx.isInteraction) {
        ctx.deferred
          ? ctx.interaction!.followUp({ embeds: embed })
          : ctx.interaction!.reply({ embeds: embed })
        return
      } else {
        await (ctx.channel as TextChannel).send({ embeds: embed })
        return
      }
    }
    let page = 0
    const getButton = (p: number): any => {
      const firstEmbed = p === 0
      const lastEmbed = p === embed.length - 1
      const pageEmbed = embed[p]
      const first = new ButtonBuilder()
        .setCustomId('fast')
        .setEmoji('⏪')
        .setStyle(ButtonStyle.Primary)
      if (firstEmbed) first.setDisabled(true)
      const back = new ButtonBuilder()
        .setCustomId('back')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Primary)
      if (firstEmbed) back.setDisabled(true)
      const next = new ButtonBuilder()
        .setCustomId('next')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Primary)
      if (lastEmbed) next.setDisabled(true)
      const last = new ButtonBuilder()
        .setCustomId('last')
        .setEmoji('⏩')
        .setStyle(ButtonStyle.Primary)
      if (lastEmbed) last.setDisabled(true)
      const stop = new ButtonBuilder()
        .setCustomId('stop')
        .setEmoji('⏹️')
        .setStyle(ButtonStyle.Danger)
      const row = new ActionRowBuilder().addComponents(first, back, stop, next, last)
      return { embeds: [pageEmbed], components: [row] }
    }
    const msgOptions = getButton(0)
    let msg: any
    if (ctx.isInteraction) {
      msg = ctx.deferred
        ? await ctx.interaction!.followUp({
            ...msgOptions,
            fetchReply: true as boolean,
          })
        : await ctx.interaction!.reply({
            ...msgOptions,
            fetchReply: true,
          })
    } else {
      msg = await (ctx.channel as TextChannel).send({
        ...msgOptions,
        fetchReply: true,
      })
    }
    let author: any
    if (ctx instanceof CommandInteraction) {
      author = ctx.user
    } else {
      author = ctx.author
    }
    const filter = (int: any): any => int.user.id === author.id
    const collector = msg.createMessageComponentCollector({
      filter,
      time: 60000,
    })
    collector.on('collect', async (interaction: any) => {
      if (interaction.user.id === author.id) {
        await interaction.deferUpdate()
        if (interaction.customId === 'fast') {
          if (page !== 0) {
            page = 0
            const newEmbed = getButton(page)
            await interaction.editReply(newEmbed)
          }
        }
        if (interaction.customId === 'back') {
          if (page !== 0) {
            page--
            const newEmbed = getButton(page)
            await interaction.editReply(newEmbed)
          }
        }
        if (interaction.customId === 'stop') {
          collector.stop()
          await interaction.editReply({
            embeds: [embed[page]],
            components: [],
          })
        }
        if (interaction.customId === 'next') {
          if (page !== embed.length - 1) {
            page++
            const newEmbed = getButton(page)
            await interaction.editReply(newEmbed)
          }
        }
        if (interaction.customId === 'last') {
          if (page !== embed.length - 1) {
            page = embed.length - 1
            const newEmbed = getButton(page)
            await interaction.editReply(newEmbed)
          }
        }
      } else {
        await interaction.reply({
          content: "You can't use this button",
          ephemeral: true,
        })
      }
    })

    collector.on('end', async () => {
      await msg.edit({ embeds: [embed[page]], components: [] })
    })
  }
}
