# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mahina Bot is a Discord music bot + AI assistant written in TypeScript (ESM). It uses Lavalink for audio playback,
NVIDIA/OpenAI for AI features, Prisma ORM with PostgreSQL, and Express for a file management API. Supports 17 languages,
86 commands across 8 categories, and Discord sharding.

## Development Commands

```bash
pnpm install            # Install deps (Node >=22.11.0 required)
pnpm start:dev          # Dev mode: tsup rebuild + nodemon watching src/
pnpm build              # Production bundle → dist/ (tsup, ESM, minified)
pnpm start              # Run compiled bot from dist/index.js
pnpm start:max          # Run with 4GB heap (--max-old-space-size=4096)
pnpm lint               # ESLint (AdonisJS config)
pnpm format             # Prettier (AdonisJS config)
pnpm db:push            # Push Prisma schema to DB
pnpm db:migrate         # Create Prisma migration
docker-compose up lavalink -d   # Start Lavalink for local dev
```

No automated test suite yet. `pnpm lint && pnpm build` is the minimum pre-PR check. If tests are added, use `*.spec.ts`.

## Architecture

### Entry & Lifecycle

`src/index.ts` → displays logo, starts `ShardingManager` (`src/shard.ts`) → each shard instantiates `MahinaBot`
(`src/common/mahina_bot.ts`) → calls `client.start(token)` which initializes in order:
1. i18n (locales)
2. AIManager + Prisma (if API keys present)
3. Commands (86, with slash command registration + i18n name/description localizations)
4. Events (client, player, node)
5. Discord login
6. Plugins

### Core Classes

- **`MahinaBot`** (`src/common/mahina_bot.ts`): Extends `discord.js Client`. Holds `commands` Collection, `db`
  (ServerData/Prisma), `manager` (Lavalink), `aiManager`, and `services` object with all AI service instances.

- **`Command`** (`src/common/command.ts`): Base class all 86 commands extend. Key properties: `player` requirements
  (voice channel, DJ mode, active queue), `permissions` (client/user/dev), `vote` (TopGG gate), `cooldown` (default 3s).
  Subclasses implement `run(client, ctx, args)`.

- **`Context`** (`src/common/context.ts`): Abstracts `CommandInteraction | Message` into a unified interface. Provides
  `sendMessage()`, `editMessage()`, `sendDeferMessage()`, `locale(key, ...args)` for i18n.

- **`Event`** (`src/common/event.ts`): Base class for event handlers. Event types: `ClientEvents`,
  `LavalinkManagerEvents`, `NodeManagerEvents`, plus custom events (`setupSystem`, `aiMention`, `setupButtons`).

- **`MahinaLinkClient`** (`src/common/mahina_link_client.ts`): Extends `LavalinkManager`. Handles search, autoplay,
  requester transformation. Search platform configurable via `SEARCH_ENGINE` env var.

- **`ServerData`** (`src/database/server.ts`): Prisma wrapper with lazy-init. Methods for guild config, playlists,
  chat history, AI config. Prisma schema in `prisma/schema.prisma`.

### AI Service Layer (`src/services/`)

All orchestrated by **`AIManager`** (`src/services/ai_manager.ts`), initialized only when API keys are present:

- `nvidia_ai_service.ts` — Legacy NVIDIA API (14+ models, OpenAI-compatible)
- `nvidia_enhanced_service.ts` — Multimodal/vision, RAG, personality system (8 personas), streaming
- `ai_context_service.ts` — Conversation context management between messages
- `ai_memory_service.ts` — User preference persistence and learning
- `ai_job_service.ts` — pg-boss async job queue for long tasks
- `nvidia_tts_service.ts`, `nvidia_embedding_service.ts`, `nvidia_cosmos_service.ts`, `nvidia_guard_service.ts`
- `lavalink_health_service.ts` — Node health monitoring

Access via `client.aiManager` (orchestrator) or `client.services.<name>` (direct).

### Command Categories (`src/commands/`)

`ai/`, `music/`, `playlist/`, `filters/`, `config/`, `info/`, `dev/`, `stream/`

### Event Handlers (`src/events/`)

- `client/` — Discord events: `interaction_create` (slash commands), `message_create` (prefix commands + AI mention),
  `voice_state_update`, `ready`, `guild_create`/`guild_delete`
- `player/` — Lavalink: `track_start`, `track_end`, `queue_end`, `player_destroy`, `player_disconnect`
- `node/` — Lavalink node lifecycle

Permission checking order in event handlers:
Guild context → Bot channel perms → Command client perms → User perms → Dev-only → Vote gate → Player requirements

### Express API (`src/server.ts`)

File manager with Basic Auth. Endpoints: upload, remote upload, preview (FFmpeg screenshots), video streaming, delete.

## Key Patterns

### Path Aliases

Always use configured aliases over relative imports:
```typescript
import { MahinaBot } from '#common/mahina_bot'   // src/common/
import { Utils } from '#utils/utils'               // src/utils/
import Play from '#commands/music/play'            // src/commands/
```

### i18n Usage

```typescript
ctx.locale('event.message.cooldown', { time: 5.5, command: 'play' })
// or directly:
import { T } from '#common/i18n'
T(locale, 'translation.key', { placeholder: 'value' })
```

Locale files in `src/locales/` and `locales/`. Default language: `PortugueseBR`.

### Cooldowns

Per-command, per-user tracking via `client.cooldown` (nested Collection: command name → user ID → timestamp).

### Setup Channel

Messages in a guild's setup channel (persistent music player) auto-delete after 5 seconds.

## Naming Conventions

- Files: `snake_case.ts` (e.g., `message_create.ts`, `ai_memory_service.ts`)
- Classes: `PascalCase`, Variables/functions: `camelCase`
- Commits: Conventional Commits (`feat(service): ...`, `fix(config): ...`, `chore: ...`)

## Environment

All env vars validated with Zod in `src/env.ts`. Required: `TOKEN`, `CLIENT_ID`, `NODES` (Lavalink JSON array).
Optional AI keys: `NVIDIA_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`. See `src/env.ts` for the full schema.

## Database (Prisma)

Schema in `prisma/schema.prisma`. Key models: `Guild` (config), `Setup` (music player channel), `Stay` (24/7 voice),
`DJ` (mode + roles), `Playlist` (user playlists with JSON tracks), `ChatHistory`, `AIConfig`.
