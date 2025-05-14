# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mahina Bot is a Discord music bot written in TypeScript. It uses Lavalink for audio playback and can be deployed with Docker. The bot includes features for music playback, playlist management, filters, and various configuration settings.

## Architecture

- **Discord Client**: Extends Discord.js Client, handles bot commands and events
- **Lavalink Client**: Manages connection to Lavalink nodes for audio streaming
- **Command System**: Structured command definitions with categories (music, config, info, etc.)
- **Database**: Prisma ORM with MongoDB (configurable for different databases)
- **i18n**: Internationalization support with multiple language options

## Required Environment Variables

The bot requires several environment variables to be set for proper functioning:
- `TOKEN`: Discord bot token
- `CLIENT_ID`: Discord client ID
- `NODES`: Lavalink nodes configuration (JSON array)
- `DATABASE_URL`: Database connection URL

See `src/env.ts` for a complete list of environment variables and their types.

## Commands

### Development Commands

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run start:dev

# Build the application
npm run build

# Start the application
npm run start
# Or with increased memory
npm run start:max

# Format code
npm run format

# Lint code
npm run lint

# Prisma commands
npm run db:push     # Push schema changes to DB
npm run db:migrate  # Create migrations
```

### Docker Commands

```bash
# Start the application with Docker Compose
docker-compose up -d

# Start only Lavalink (for development)
docker-compose up lavalink -d

# Build and start Mahina container
docker-compose up mahina -d
```

## Working with the Codebase

### Command Structure

Commands are defined in the `src/commands/` directory, organized into categories. Each command extends the `Command` base class and implements a `run` method.

Example command structure:
```typescript
export default class ExampleCommand extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'command-name',
      description: {
        content: 'i18n.key.for.description',
        examples: ['example1', 'example2'],
        usage: 'command-name <arg>',
      },
      category: 'category',
      aliases: ['alias1', 'alias2'],
      cooldown: 3,
      args: true,
      permissions: {
        client: ['RequiredPermission1', 'RequiredPermission2'],
        user: [], // Empty means no special permissions required
      },
      slashCommand: true,
      options: [], // Slash command options
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    // Command implementation
  }
}
```

### Database Operations

The bot uses Prisma ORM with MongoDB by default. Database operations are handled through the `ServerData` class in `src/database/server.ts`.

Example database operation:
```typescript
// Get guild configuration
const guildData = await client.db.getGuild(guildId)
```

### Events

Events are defined in the `src/events/` directory, organized by type:
- `client`: Discord.js client events
- `player`: Lavalink player events
- `node`: Lavalink node events

### Internationalization

The bot supports multiple languages through the i18n system. Translation keys are stored in JSON files in the `locales/` directory.

To use translations in code:
```typescript
// In commands
ctx.locale('translation.key', { placeholder: 'value' })

// Direct usage
import { T } from '#common/i18n'
T(locale, 'translation.key', { placeholder: 'value' })
```