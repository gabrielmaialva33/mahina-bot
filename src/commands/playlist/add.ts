import { ApplicationCommandOptionType } from 'discord.js'
import { LoadType } from 'shoukaku'

import { Command, Context, Mahina } from '#common/index'

export default class Add extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'add',
      description: {
        content: 'Adiciona uma música a uma playlist',
        examples: ['add <playlist> <song>'],
        usage: 'add <playlist> <song>',
      },
      category: 'playlist',
      aliases: ['add'],
      cooldown: 3,
      args: true,
      player: {
        voice: false,
        dj: false,
        active: false,
        dj_perm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'playlist',
          description: 'A playlist que você quer adicionar a música',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'song',
          description: 'A música que você quer adicionar',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    })
  }
  async run(client: Mahina, ctx: Context, args: string[]): Promise<any> {
    const playlist = args[0]
    const song = args[1]

    if (!playlist)
      return await ctx.sendMessage({
        embeds: [
          {
            description: '𝙈𝙚 𝙙𝙖 𝙪𝙢𝙖 𝙥𝙡𝙖𝙮𝙡𝙞𝙨𝙩',
            color: client.color.red,
          },
        ],
      })

    if (!song)
      return await ctx.sendMessage({
        embeds: [
          {
            description: '𝙈𝙚 𝙙𝙖 𝙪𝙢𝙖 𝙢𝙪́𝙨𝙞𝙘𝙖',
            color: client.color.red,
          },
        ],
      })

    const playlistData = await client.db.getPlaylist(ctx.author!.id, playlist)
    if (!playlistData)
      return await ctx.sendMessage({
        embeds: [
          {
            description: '𝙉𝙖𝙤 𝙚𝙭𝙞𝙨𝙩𝙚 𝙖 𝙥𝙡𝙖𝙮𝙡𝙞𝙨𝙩',
            color: client.color.red,
          },
        ],
      })

    const res = await client.queue.search(song)
    if (!res)
      return await ctx.sendMessage({
        embeds: [
          {
            description: '𝙉𝙖𝙤 𝙚𝙭𝙞𝙨𝙩𝙚 𝙖 𝙢𝙪́𝙨𝙞𝙘𝙖',
            color: client.color.red,
          },
        ],
      })
    let trackStrings
    let count
    if (res.loadType === LoadType.PLAYLIST) {
      trackStrings = res.data.tracks.map((track) => track)
      count = res.data.tracks.length
    } else {
      // @ts-ignore
      trackStrings = [res.data[0]] as any
      count = 1
    }
    await client.db.addSong(ctx.author!.id, playlist, trackStrings)

    ctx.sendMessage({
      embeds: [
        {
          description: `𝘼𝙙𝙞𝙘𝙞𝙤𝙣𝙖𝙙𝙖 ${count} 𝙖 ${playlistData.name}`,
          color: client.color.green,
        },
      ],
    })
  }
}
