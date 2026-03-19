import { ApplicationCommandOptionType, EmbedBuilder, User } from 'discord.js'
import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
import { PersonalityRLService } from '#src/services/personality_rl_service'

export default class PersonalityCommand extends Command {
  private personalityService: PersonalityRLService

  constructor(client: MahinaBot) {
    super(client, {
      name: 'personality',
      description: {
        content: 'cmd.personality.description',
        examples: ['personality', 'personality @usuario'],
        usage: 'personality [usuário]',
      },
      category: 'info',
      aliases: ['animal', 'spiritanimal', 'wow', 'personalidade'],
      cooldown: 30, // 30 segundos de cooldown
      args: false,
      player: {
        voice: false,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'user',
          description: 'cmd.personality.options.user',
          type: ApplicationCommandOptionType.User,
          required: false,
        },
      ],
    })

    this.personalityService = new PersonalityRLService(client)
  }

  public async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    let targetUser: User
    if (ctx.isInteraction) {
      targetUser = ctx.interaction?.options.getUser('user') || ctx.author
    } else {
      const mentionedUser = ctx.message?.mentions.users.first()
      targetUser = mentionedUser || ctx.author
    }

    const isAnalyzingSelf = targetUser.id === ctx.author.id

    const loadingEmbed = new EmbedBuilder()
      .setColor(client.config.color.violet)
      .setTitle(ctx.locale('cmd.personality.ui.loading.title'))
      .setDescription(
        isAnalyzingSelf
          ? ctx.locale('cmd.personality.ui.loading.self')
          : ctx.locale('cmd.personality.ui.loading.other', { user: targetUser.username })
      )
      .setThumbnail('https://i.imgur.com/wSTFkRM.png')
      .setFooter({ text: ctx.locale('cmd.personality.ui.loading.footer') })

    const msg = await ctx.sendMessage({ embeds: [loadingEmbed] })

    try {
      const userStats = await this.personalityService.getUserStats(targetUser.id, ctx.guild!.id)
      const spiritAnimal = await this.personalityService.analyzePersonality(
        targetUser.id,
        ctx.guild!.id,
        userStats
      )

      const resultEmbed = this.personalityService.createPersonalityEmbed(
        spiritAnimal,
        userStats,
        targetUser.username
      )

      resultEmbed.addFields({
        name: ctx.locale('cmd.personality.ui.result.server'),
        value: ctx.locale('cmd.personality.ui.result.server_value', {
          guild: ctx.guild?.name ?? 'Servidor',
        }),
        inline: false,
      })

      await msg.edit({ embeds: [resultEmbed] })

      if (process.env.PERSONALITY_WEBHOOK_URL) {
        await this.personalityService.sendAnalysisViaWebhook(
          resultEmbed,
          targetUser.username,
          targetUser.displayAvatarURL()
        )
      }

      if (spiritAnimal.rarity === 'lendário') {
        await msg.react('🌟')
        await msg.react('🔥')
        await msg.react('💎')
      } else if (spiritAnimal.rarity === 'épico') {
        await msg.react('✨')
        await msg.react('💜')
      } else if (spiritAnimal.rarity === 'raro') {
        await msg.react('💙')
      }

      if (spiritAnimal.name === 'Fênix Elemental' && userStats.activityTime === 'madrugada') {
        await ctx.sendFollowUp(ctx.locale('cmd.personality.ui.easter_egg.phoenix_night'))
      }
    } catch (error: unknown) {
      this.client.logger.error('Personality analysis error:', error)

      const errorEmbed = new EmbedBuilder()
        .setColor(client.config.color.red)
        .setTitle(ctx.locale('cmd.personality.ui.error.title'))
        .setDescription(ctx.locale('cmd.personality.ui.error.description'))
        .setFooter({ text: ctx.locale('cmd.personality.ui.error.footer') })

      await msg.edit({ embeds: [errorEmbed] })
    }
  }
}
