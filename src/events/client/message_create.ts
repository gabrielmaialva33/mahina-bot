import { ChannelType, Collection, Message, PermissionFlagsBits } from 'discord.js'

import { Context, Event, Mahina } from '#common/index'

export default class MessageCreate extends Event {
  constructor(client: Mahina, file: string) {
    super(client, file, { name: 'messageCreate' })
  }

  async run(message: Message): Promise<any> {
    if (message.author.bot) return
    if (!message.guildId) return

    const setup = await this.client.db.getSetup(message.guildId)
    if (setup && setup.text_id)
      if (setup.text_id === message.channelId) return this.client.emit('setupSystem', message)

    let prefix = await this.client.db.getPrefix(message.guildId)
    const mention = new RegExp(`^<@!?${this.client.user!.id}>( |)$`)
    if (message.content.match(mention)) {
      await message.reply({
        content: `𝙊𝙞𝙚 𝙢𝙖𝙣𝙖̃.. ✨, 𝙢𝙚𝙪 𝙥𝙧𝙚𝙛𝙞𝙭𝙤 𝙥𝙖𝙧𝙖 𝙚𝙨𝙩𝙚 𝙨𝙚𝙧𝙫𝙞𝙙𝙤𝙧 𝙚́  \`${prefix.prefix}\` 𝙌𝙪𝙚𝙧 𝙨𝙖𝙗𝙚𝙧 𝙢𝙖𝙞𝙨 𝙪𝙨𝙚 𝙤 𝙘𝙤𝙢𝙖𝙣𝙙𝙤 \`${prefix.prefix}help\`\n𝙎𝙚𝙟𝙖 𝙛𝙚𝙡𝙞𝙯 🍁 𝙘𝙤𝙢 𝙦𝙪𝙚𝙢 𝙨𝙚𝙧 𝙛𝙚𝙡𝙞𝙯 𝙘𝙤𝙢 𝙫𝙤𝙘𝙚̂ 🌺`,
      })
      return
    }
    const escapeRegex = (str: string): string => {
      if (str.trim() === null) return '!'
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
    const prefixRegex = new RegExp(
      `^(<@!?${this.client.user!.id}>|${escapeRegex(prefix.prefix)})\\s*`
    )
    if (!prefixRegex.test(message.content)) return
    const [matchedPrefix] = message.content.match(prefixRegex)!

    const args = message.content.slice(matchedPrefix.length).trim().split(/ +/g)

    const cmd = args.shift()!.toLowerCase()
    const command =
      this.client.commands.get(cmd) ||
      this.client.commands.get(this.client.aliases.get(cmd) as string)
    if (!command) return
    const ctx = new Context(message, args)
    ctx.setArgs(args)

    let dm = message.author.dmChannel
    if (typeof dm === 'undefined') dm = await message.author.createDM()

    if (
      !message.inGuild() ||
      !message.channel
        .permissionsFor(message.guild!.members.me!)
        .has(PermissionFlagsBits.ViewChannel)
    )
      return

    if (!message.guild!.members.me!.permissions.has(PermissionFlagsBits.SendMessages))
      return await message.author
        .send({
          content: `⛔ 𝙉𝙖̃𝙤 𝙩𝙚𝙣𝙝𝙤 𝙥𝙚𝙧𝙢𝙞𝙨𝙨𝙖̃𝙤 𝙙𝙚 **\`SendMessage\`** 𝙚𝙣𝙫𝙞𝙖𝙧 𝙢𝙚𝙣𝙨𝙖𝙜𝙚𝙣𝙨 𝙣𝙚𝙨𝙨𝙚 𝙘𝙖𝙣𝙖𝙡 \`${message.guild.name}\`\n𝘾𝙖𝙣𝙖𝙡: <#${message.channelId}>`,
        })
        .catch(() => {})

    if (!message.guild!.members.me!.permissions.has(PermissionFlagsBits.EmbedLinks))
      return await message.reply({
        content: '⛔ 𝙉𝙖̃𝙤 𝙩𝙚𝙣𝙝𝙤 𝙥𝙚𝙧𝙢𝙞𝙨𝙨𝙖̃𝙤 𝙙𝙚 **`EmbedLinks`** .',
      })

    if (command.permissions) {
      if (command.permissions.client) {
        if (!message.guild!.members.me!.permissions.has(command.permissions.client))
          return await message.reply({
            content: '⛔ 𝙈𝙖𝙣𝙖̃.. 𝙩𝙚𝙣𝙝𝙤 𝙥𝙚𝙧𝙢𝙞𝙨𝙨𝙤̃𝙚𝙨 𝙨𝙪𝙛𝙞𝙘𝙞𝙚𝙣𝙩𝙚𝙨 𝙥𝙖𝙧𝙖 𝙚𝙭𝙚𝙘𝙪𝙩𝙖𝙧 𝙚𝙨𝙩𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙚.',
          })
      }

      if (command.permissions.user) {
        if (!message.member!.permissions.has(command.permissions.user))
          return await message.reply({
            content:
              '⛔ 𝙈𝙖𝙣𝙖̃..  𝙤𝙘𝙚̂ 𝙣𝙖̃𝙤 𝙩𝙚𝙢 𝙥𝙚𝙧𝙢𝙞𝙨𝙨𝙤̃𝙚𝙨 𝙨𝙪𝙛𝙞𝙘𝙞𝙚𝙣𝙩𝙚𝙨 𝙥𝙖𝙧𝙖 𝙪𝙨𝙖𝙧 𝙚𝙨𝙩𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙚.. 𝙘𝙖𝙨𝙩𝙖 𝙗𝙖𝙞𝙭𝙖 𝙠𝙠',
          })
      }
      if (command.permissions.dev) {
        if (this.client.env.DISC_OWNER_IDS) {
          const findDev = this.client.env.DISC_OWNER_IDS.split(',').find(
            (x) => x === message.author.id
          )
          if (!findDev) return
        }
      }
    }
    if (command.player) {
      if (command.player.voice) {
        if (!message.member!.voice.channel)
          return await message.reply({
            content: `𝙈𝙖𝙣𝙖̃..  𝙤𝙘𝙚̂ 𝙩𝙚𝙢 𝙦𝙪𝙚 𝙩𝙖 𝙘𝙤𝙣𝙚𝙘𝙩𝙖𝙙𝙚 𝙖 𝙪𝙢𝙚 𝙘𝙖𝙣𝙖𝙡 𝙙𝙚 𝙫𝙤𝙭 𝙥𝙧𝙖 𝙪𝙨𝙖𝙧 𝙚𝙨𝙩𝙚 \`${command.name}\` 𝙘𝙤𝙢𝙢𝙖𝙣𝙙𝙚.`,
          })

        if (!message.guild!.members.me!.permissions.has(PermissionFlagsBits.Speak))
          return await message.reply({
            content: `⛔ 𝙈𝙖𝙣𝙖̃.. 𝙩𝙚𝙣𝙝𝙤 𝙖 𝙥𝙚𝙧𝙢𝙞𝙨𝙨𝙖̃𝙤 \`CONNECT\`  𝙥𝙖𝙧𝙖 𝙚𝙭𝙚𝙘𝙪𝙩𝙖𝙧 𝙚𝙨𝙩𝙚 \`${command.name}\` 𝙘𝙤𝙢𝙖𝙣𝙙𝙚.`,
          })

        if (!message.guild!.members.me!.permissions.has(PermissionFlagsBits.Speak))
          return await message.reply({
            content: `𝙈𝙖𝙣𝙖̃.. 𝙩𝙚𝙣𝙝𝙤 𝙖 𝙥𝙚𝙧𝙢𝙞𝙨𝙨𝙖̃𝙤 \`SPEAK\` 𝙥𝙖𝙧𝙖 𝙚𝙭𝙚𝙘𝙪𝙩𝙖𝙧 𝙚𝙨𝙩𝙚 \`${command.name}\` 𝙘𝙤𝙢𝙖𝙣𝙙𝙚.`,
          })

        if (
          message.member!.voice.channel.type === ChannelType.GuildStageVoice &&
          !message.guild!.members.me!.permissions.has(PermissionFlagsBits.RequestToSpeak)
        )
          return await message.reply({
            content: `𝙈𝙖𝙣𝙖̃.. 𝙩𝙚𝙣𝙝𝙤 𝙖 𝙥𝙚𝙧𝙢𝙞𝙨𝙨𝙖̃ \`REQUEST TO SPEAK\` 𝙥𝙖𝙧𝙖 𝙚𝙭𝙚𝙘𝙪𝙩𝙖𝙧 𝙚𝙨𝙩𝙚 \`${command.name}\` 𝙘𝙤𝙢𝙖𝙣𝙙𝙚.`,
          })

        if (message.guild!.members.me!.voice.channel) {
          if (message.guild!.members.me!.voice.channelId !== message.member!.voice.channelId)
            return await message.reply({
              content: `𝙈𝙖𝙣𝙖̃..  𝙤𝙘𝙚̂ 𝙩𝙚𝙢 𝙦𝙪𝙚 𝙩𝙖 𝙘𝙤𝙣𝙚𝙘𝙩𝙖𝙙𝙚 𝙖 <#${message.guild!.members.me!.voice.channel.id}> 𝙙𝙚 𝙫𝙤𝙭 𝙥𝙧𝙖 𝙪𝙨𝙖𝙧 𝙚𝙨𝙩𝙚 \`${command.name}\` 𝙘𝙤𝙢𝙢𝙖𝙣𝙙𝙚.`,
            })
        }
      }
      if (command.player.active) {
        if (!this.client.queue.get(message.guildId))
          return await message.reply({
            content: '🔇 𝙉𝙖𝙙𝙚 𝙚𝙨𝙩𝙖́ 𝙩𝙤𝙘𝙖𝙣𝙙𝙤 𝙖𝙜𝙤𝙧𝙖.',
          })
        if (!this.client.queue.get(message.guildId).queue)
          return await message.reply({
            content: '🔇 𝙉𝙖𝙙𝙚 𝙚𝙨𝙩𝙖́ 𝙩𝙤𝙘𝙖𝙣𝙙𝙤 𝙖𝙜𝙤𝙧𝙖.',
          })
        if (!this.client.queue.get(message.guildId).current)
          return await message.reply({
            content: '🔇 𝙉𝙖𝙙𝙚 𝙚𝙨𝙩𝙖́ 𝙩𝙤𝙘𝙖𝙣𝙙𝙤 𝙖𝙜𝙤𝙧𝙖.',
          })
      }
      if (command.player.dj) {
        const dj = await this.client.db.getDj(message.guildId)
        if (dj && dj.mode) {
          const djRole = await this.client.db.getRoles(message.guildId)
          if (!djRole)
            return await message.reply({
              content: '❌ 𝙘𝙖𝙧𝙜𝙤 𝘿𝙅 𝙣𝙖̃𝙤 𝙙𝙚𝙛𝙞𝙣𝙞𝙙𝙚',
            })
          const findDJRole = message.member!.roles.cache.find((x: any) =>
            djRole.map((y) => y.role_id).includes(x.id)
          )
          if (!findDJRole) {
            if (!message.member!.permissions.has(PermissionFlagsBits.ManageGuild)) {
              return await message
                .reply({
                  content: '❌ 𝙢𝙖𝙣𝙖̃.. 𝙫𝙘 𝙥𝙧𝙚𝙘𝙞𝙨𝙖 𝙨𝙚𝙧 𝘿𝙅 𝙥𝙧𝙖 𝙧𝙤𝙙𝙖𝙧 𝙚𝙘̧𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙚.',
                })
                .then((msg) => setTimeout(() => msg.delete(), 5000))
            }
          }
        }
      }
    }
    if (command.args) {
      if (!args.length) {
        const embed = this.client
          .embed()
          .setColor(this.client.color.red)
          .setTitle('𝐀𝐫𝐠𝐮𝐦𝐞𝐧𝐭𝐨𝐬 𝐚𝐮𝐬𝐞𝐧𝐭𝐞𝐬')
          .setDescription(
            `𝙈𝙖𝙣𝙖.. 𝙗𝙪𝙧𝙧𝙚 🤭 𝙥𝙖𝙨𝙨𝙚 𝙤𝙨 𝙖𝙧𝙜𝙪𝙢𝙚𝙣𝙩𝙤𝙨 𝙣𝙚𝙘𝙚𝙨𝙨𝙖́𝙧𝙞𝙤𝙨 𝙥𝙖𝙧𝙖 𝙖 \`${
              command.name
            }\` 𝙘𝙤𝙢𝙖𝙣𝙙𝙚.\n\n𝙀𝙭𝙚𝙢𝙥𝙡𝙤𝙨:\n${
              command.description.examples ? command.description.examples.join('\n') : '𝐍𝐨𝐧𝐞'
            }`
          )
          .setFooter({ text: '𝙎𝙞𝙣𝙩𝙖𝙭𝙚: [] = 𝙤𝙥𝙘𝙞𝙤𝙣𝙖𝙡, <> = 𝙤𝙗𝙧𝙞𝙜𝙖𝙩𝙤́𝙧𝙞𝙤' })
        return await message.reply({ embeds: [embed] })
      }
    }

    if (!this.client.cooldown.has(cmd)) {
      this.client.cooldown.set(cmd, new Collection())
    }
    const now = Date.now()
    const timestamps = this.client.cooldown.get(cmd)

    const cooldownAmount = Math.floor(command.cooldown || 5) * 1000
    if (!timestamps.has(message.author.id)) {
      timestamps.set(message.author.id, now)
      setTimeout(() => timestamps.delete(message.author.id), cooldownAmount)
    } else {
      const expirationTime = timestamps.get(message.author.id) + cooldownAmount
      const timeLeft = (expirationTime - now) / 1000
      if (now < expirationTime && timeLeft > 0.9) {
        return await message.reply({
          content: `𝙈𝙖𝙣𝙖̃..🥺 𝙚𝙨𝙥𝙚𝙧𝙖 ${timeLeft.toFixed(
            1
          )} 𝙪𝙣𝙨 𝙨𝙚𝙜𝙪𝙣𝙙𝙚𝙨 𝙥𝙧𝙖 𝙪𝙨𝙖𝙧 𝙤 𝙘𝙤𝙢𝙖𝙣𝙙𝙚 \`${cmd}\` .`,
        })
      }
      timestamps.set(message.author.id, now)
      setTimeout(() => timestamps.delete(message.author.id), cooldownAmount)
    }
    if (args.includes('@everyone') || args.includes('@here'))
      return await message.reply({
        content: '𝙈𝙖𝙣𝙖̃.. 𝙣𝙖̃𝙤 𝙥𝙤𝙙𝙚 𝙪𝙨𝙖𝙧 𝙚𝙨𝙩𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙤 𝙘𝙤𝙢 𝙩𝙤𝙙𝙤𝙨 𝙤𝙪 𝙖𝙦𝙪𝙞.',
      })

    try {
      return command.run(this.client, ctx, ctx.args)
    } catch (error) {
      this.client.logger.error(error)
      await message.reply({ content: `𝘿𝙚𝙨𝙘𝙪𝙡𝙥𝙖 𝙢𝙖𝙣𝙖.. 𝙚𝙧𝙧𝙚𝙞 🤭: \`${error}\`` })
      return
    }
  }
}
