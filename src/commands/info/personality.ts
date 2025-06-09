import {
  CommandInteraction,
  Message,
  EmbedBuilder,
  ApplicationCommandOptionType,
  User,
} from 'discord.js'
import Command from '#common/command'
import type { Context, MahinaBot } from '#common/index'
import { PersonalityRLService } from '#src/services/personality_rl_service'

export default class PersonalityCommand extends Command {
  private personalityService: PersonalityRLService

  constructor(client: MahinaBot) {
    super(client, {
      name: 'personality',
      description: {
        content:
          '🍁 Descubra seu animal espiritual do World of Warcraft através de análise de personalidade com IA',
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
          description: '👤 O usuário que você deseja analisar',
          type: ApplicationCommandOptionType.User,
          required: false,
        },
      ],
    })

    this.personalityService = new PersonalityRLService(client)
  }

  public async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    // Get target user
    let targetUser: User
    if (ctx.isInteraction) {
      targetUser = ctx.interaction?.options.getUser('user') || ctx.author
    } else {
      const mentionedUser = ctx.message?.mentions.users.first()
      targetUser = mentionedUser || ctx.author
    }

    // Check if analyzing self or others
    const isAnalyzingSelf = targetUser.id === ctx.author.id

    // Create loading embed
    const loadingEmbed = new EmbedBuilder()
      .setColor(client.config.color.violet)
      .setTitle('🔮 Analisando Personalidade...')
      .setDescription(
        isAnalyzingSelf
          ? '🍁 O Oráculo Espiritual de Warcraft está analisando sua essência...'
          : `🍁 Analisando a essência de **${targetUser.username}**...`
      )
      .setThumbnail('https://i.imgur.com/wSTFkRM.png')
      .setFooter({ text: 'Weed Of Warcraft | Análise com Aprendizado por Reforço' })

    const msg = await ctx.sendMessage({ embeds: [loadingEmbed] })

    try {
      // Get user stats for analysis
      const userStats = await this.personalityService.getUserStats(targetUser.id, ctx.guild!.id)

      // Analyze personality using RL
      const spiritAnimal = await this.personalityService.analyzePersonality(
        targetUser.id,
        ctx.guild!.id,
        userStats
      )

      // Create result embed
      const resultEmbed = this.personalityService.createPersonalityEmbed(
        spiritAnimal,
        userStats,
        targetUser.username
      )

      // Add special fields for server
      resultEmbed.addFields({
        name: '🍁 Servidor',
        value: `Análise realizada em **${ctx.guild?.name}**`,
        inline: false,
      })

      // Update message with result
      await msg.edit({ embeds: [resultEmbed] })

      // Send to webhook if it's the specific server
      if (ctx.guild?.id === '1203411439025704970') {
        // Replace with actual Weed of Warcraft server ID
        await this.personalityService.sendAnalysisViaWebhook(
          resultEmbed,
          targetUser.username,
          targetUser.displayAvatarURL()
        )
      }

      // Add special reactions based on rarity
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

      // Easter egg: Special message for specific combinations
      if (spiritAnimal.name === 'Fênix Elemental' && userStats.activityTime === 'madrugada') {
        await ctx.followUp(
          '🔥 **Segredo Descoberto!** A Fênix noturna é especialmente poderosa! Você desbloqueou uma conquista secreta.'
        )
      }
    } catch (error: any) {
      console.error('Personality Analysis Error:', error)

      const errorEmbed = new EmbedBuilder()
        .setColor(client.config.color.red)
        .setTitle('❌ Erro na Análise')
        .setDescription(
          'O Oráculo teve dificuldades em ler sua essência. Tente novamente mais tarde.'
        )
        .setFooter({ text: 'Weed Of Warcraft' })

      await msg.edit({ embeds: [errorEmbed] })
    }
  }
}
