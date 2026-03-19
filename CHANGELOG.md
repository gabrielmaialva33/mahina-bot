# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-19

Definitive release. Full version reboot.

### Added

- **MahinaBrain**: sentient personality system with uncensored humor and streaming responses
- **AI Streaming**: real-time responses with typing cursor via Discord message editing
- **AI Tools**: music control, web search, code execution via tool calling
- **AI Vision**: image analysis with NVIDIA multimodal service
- **AI Memory**: remembers user facts and actively uses them in conversations
- **Personality System**: 4 overlays (Classic, Friendly, Professional, DJ) with reinforcement learning
- **Server Learning Service**: learns server culture, memes, and social dynamics
- **Mahina Will Service**: autonomous decision-making for proactive behavior
- **Proactive Interactions**: spontaneously comments on conversations
- **AI Context Service**: conversation context management between messages
- **AI Queue Service**: async job queue with pg-boss for long-running tasks
- **YouTube OAuth + remoteCipher**: playback + direct links fully working
- **Self-hosted yt-cipher**: private YouTube signature deciphering server
- **Anti-crash Resilience**: Discord API errors no longer kill the process
- **Auto-deploy Slash Commands**: updates commands across all guilds on startup
- **Runtime Modules**: logic extracted from AI commands into `*_runtime.ts` files
- **86 commands** across 8 categories (ai, music, playlist, filters, config, info, dev, stream)
- **17 languages** supported
- **Docker + CI/CD**: GitHub Actions → GHCR → VPS auto-deploy via SSH + Watchtower fallback

### Stack

- **Runtime**: Node.js 22+ (ESM, TypeScript)
- **Audio**: Lavalink 4.2.2, youtube-source 1.18.0, LavaSrc 4.8.1, LavaSearch, SponsorBlock
- **AI**: NVIDIA API (14+ models), OpenAI-compatible, Gemini
- **Database**: PostgreSQL (Prisma ORM), Redis, Qdrant (RAG)
- **Infra**: Docker Compose, GitHub Actions, GHCR

### Music Sources

- YouTube (OAuth + remoteCipher + 6 clients)
- Spotify (search + playlist resolve)
- SoundCloud, Bandcamp, Twitch, Vimeo, NicoNico
- HTTP streams

### AI Commands

- `/chat` — conversation with modes (code, analyze, explain, debug, design, vision, reasoning)
- `/stream` — streaming AI response
- `/vision` — image analysis
- `/tools` — tool calling (music, search, code)
- `/model` — AI model selection
- `/aistatus` — AI service status
- `/aianalytics` — usage analytics
- `/guard` — AI-powered moderation
- `/tts` — text-to-speech
- `/code` — code generation
- `/reason` — advanced reasoning
- `/mahinai` — advanced AI interaction
- `/search` — AI-enhanced search
- `/visualize` — data visualization

[1.0.0]: https://github.com/gabrielmaialva33/mahina-bot/releases/tag/v1.0.0
