<h1 align="center">
  <br>
  <img src=".github/assets/key.png" alt="Mahina Bot" width="200">
  <br>
  Mahina Bot - Advanced AI-Powered Discord Music & Assistant Bot 🎧
  <br>
</h1>

<p align="center">
  <strong>A sophisticated Discord bot featuring NVIDIA AI integration, advanced music playback, and intelligent conversations</strong>
</p>

<p align="center">
  <img src="https://wakatime.com/badge/user/e61842d0-c588-4586-96a3-f0448a434be4/project/ee4d4424-8e03-4569-a868-c1680db34d70.svg" alt="waka" />
  <img src="https://img.shields.io/github/license/gabrielmaialva33/mahina-bot?color=00b8d3?style=flat&logo=appveyor" alt="License" />
  <img src="https://img.shields.io/github/languages/top/gabrielmaialva33/mahina-bot?style=flat&logo=appveyor" alt="GitHub top language" >
  <img src="https://img.shields.io/github/languages/count/gabrielmaialva33/mahina-bot?style=flat&logo=appveyor" alt="GitHub language count" >
  <img src="https://img.shields.io/github/repo-size/gabrielmaialva33/mahina-bot?style=flat&logo=appveyor" alt="Repository size" >
  <a href="https://github.com/gabrielmaialva33/mahina-bot/commits/master">
    <img src="https://img.shields.io/github/last-commit/gabrielmaialva33/mahina-bot?style=flat&logo=appveyor" alt="GitHub last commit" >
    <img src="https://img.shields.io/badge/made%20by-Maia-15c3d6?style=flat&logo=appveyor" alt="Maia" >  
  </a>
</p>

<br>

<p align="center">
  <a href="#sparkles-features">Features</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
  <a href="#rocket-nvidia-ai-integration">NVIDIA AI</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
  <a href="#computer-technologies">Technologies</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
  <a href="#package-installation">Installation</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
  <a href="#gear-configuration">Configuration</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
  <a href="#electric_plug-commands">Commands</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
  <a href="#memo-license">License</a>
</p>

<br>

## :sparkles: Features

### Advanced Music System 🎵

- **High-Quality Playback** - Powered by Lavalink for superior audio streaming
- **Multi-Platform Support** - YouTube, Spotify, SoundCloud, Apple Music, Deezer, and more
- **Advanced Queue Management** - Shuffle, loop, skip, pause, and volume control
- **Playlist Support** - Create, save, and manage custom playlists
- **Audio Filters** - 10+ audio filters including bass boost, nightcore, vaporwave
- **Live Stream Support** - Play live streams and radio stations
- **Video Streaming** - Stream videos directly in Discord voice channels

### NVIDIA AI Integration 🤖

- **Multiple AI Models** - Access to cutting-edge NVIDIA models:
  - **Llama 4 Maverick** - General purpose multimodal model
  - **DeepSeek R1** - Advanced reasoning and analysis
  - **Qwen 2.5 Coder** - Specialized programming assistant
  - **Llama 3.x Series** - Various sizes for different needs
- **Intelligent Conversations** - Context-aware chat with memory and personality
- **Code Analysis & Generation** - Write, review, debug, and optimize code
- **Advanced Reasoning** - Solve complex problems with step-by-step analysis
- **Streaming Responses** - Real-time AI responses for better interactivity
- **Multi-Modal Support** - Process text and images (vision models)

### 🧠 AI Memory & Context System

- **User Memory** - Remembers preferences, interests, and interaction patterns
- **Conversation Context** - Maintains context across messages for coherent discussions
- **Personality System** - 8 different AI personalities (Friendly, Professional, Playful, DJ, Wise, Technical, Gamer,
  Teacher)
- **Learning System** - Learns from user interactions to provide better responses
- **Sentiment Analysis** - Understands user emotions and responds appropriately

### 🛠️ Bot Management

- **Multi-Language Support** - 8+ languages including English, Portuguese, Spanish, French, German
- **Custom Prefix** - Configurable command prefix per server
- **Permission System** - Granular permission control for commands
- **Database Integration** - MongoDB/Prisma for persistent data storage
- **Dashboard** - Web interface for bot configuration (optional)
- **Auto-Restart** - PM2 support for production deployments

### 📊 Additional Features

- **78 Total Commands** - Organized into 10 categories
- **Slash Command Support** - Modern Discord slash commands
- **Button & Menu Interactions** - Interactive UI components
- **Error Handling** - Robust error handling and logging
- **Performance Monitoring** - Built-in stats and monitoring
- **Developer Tools** - Eval, shell, and other dev commands

<br>

## :rocket: NVIDIA AI Integration

Mahina Bot leverages NVIDIA's cutting-edge AI models through their API to provide intelligent assistance:

### 🆕 Featured Models

| Model                    | Use Case                                | Context | Highlights                        |
| ------------------------ | --------------------------------------- | ------- | --------------------------------- |
| **Llama 4 Maverick 17B** | Multimodal AI with image & text support | 128K    | 🌟 Latest model, MoE architecture |
| **Nemotron Ultra 253B**  | Scientific reasoning & complex math     | 128K    | 🚀 Highest accuracy, enterprise   |
| **DeepSeek R1**          | Advanced reasoning, problem-solving     | 8K      | 🧠 Step-by-step analysis          |
| **Qwen 2.5 Coder 32B**   | Programming, code review & optimization | 32K     | 💻 Specialized for developers     |
| **Phi 4 Multimodal**     | Audio, image & text understanding       | 16K     | 🎙️ Multi-input processing         |
| **Cosmos Predict 7B**    | Physics simulations & world modeling    | 4K      | 🌍 Physical AI applications       |

### AI Commands

```bash
# Chat with AI
!chat <message>                  # General AI chat with context
!chat vision <image> <question>  # Analyze images with AI
!chat reasoning <problem>        # Advanced step-by-step reasoning
!mahinai <message>               # Enhanced AI with memory, personality & learning
!code <task> <language>          # Code generation and analysis
!model list                      # View all 14+ available models
!model select llama-4-maverick   # Switch to specific AI model
!model stats                     # View usage statistics
!aistatus                        # View your personal AI stats
```

### 🔥 New Features

#### TimescaleDB Integration

- **Time-Series AI Analytics** - Track model performance over time
- **Vector Search with pgvector** - Semantic search through conversation history
- **pgai Extensions** - Direct AI model calls from database
- **Continuous Aggregates** - Real-time metrics and insights

#### Job Queue System (pg-boss)

- **Async AI Processing** - Handle long-running AI tasks
- **Batch Operations** - Process multiple requests efficiently
- **Scheduled Jobs** - Recurring AI tasks and analysis
- **Priority Queue** - Important requests processed first

#### Enhanced AI Capabilities

- **RAG (Retrieval Augmented Generation)** - Context-aware responses using vector search
- **Multi-Model Support** - 14+ specialized models for different tasks
- **Streaming Responses** - Real-time AI output for better UX
- **Image Analysis** - Vision models for image understanding
- **Code Intelligence** - Advanced code analysis, debugging, and generation

### Example Usage

```javascript
// Using the new Llama 4 Maverick model
const response = await nvidiaService.chat(userId, 'Analyze this image and explain what you see', {
  model: 'llama-4-maverick',
  images: ['https://example.com/image.jpg'],
  stream: true,
})

// Queue an AI job for background processing
const jobId = await aiJobService.queueJob({
  type: 'embedding',
  userId: '123',
  guildId: '456',
  data: {
    content: 'Generate embeddings for this text',
    contentType: 'message',
  },
  priority: 1,
})
```

<br>

## :computer: Technologies

### Core Stack

- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Node.js](https://nodejs.org/)** - JavaScript runtime
- **[Discord.js](https://discord.js.org/)** - Discord API wrapper
- **[Lavalink](https://github.com/lavalink-devs/Lavalink)** - Audio streaming server

### Database & Storage

- **[TimescaleDB](https://www.timescale.com/)** - Time-series PostgreSQL
- **[pgvector](https://github.com/pgvector/pgvector)** - Vector similarity search
- **[pgai](https://github.com/timescale/pgai)** - AI functions in PostgreSQL
- **[pg-boss](https://github.com/timgit/pg-boss)** - Job queue for Node.js
- **[Redis](https://redis.io/)** - Caching and pub/sub
- **[Prisma](https://www.prisma.io/)** - Modern database ORM

### AI & ML

- **[NVIDIA AI](https://build.nvidia.com/)** - 14+ AI models including Llama 4
- **[OpenAI](https://openai.com/)** - Fallback AI provider
- **[pg_cron](https://github.com/citusdata/pg_cron)** - Scheduled jobs in PostgreSQL

### Infrastructure

- **[Docker](https://www.docker.com/)** - Containerization
- **[Grafana](https://grafana.com/)** - Monitoring dashboards
- **[PostgREST](https://postgrest.org/)** - REST API for database

<br>

## :package: Installation

### Prerequisites

- **[Node.js](https://nodejs.org/)** (v22.11.0+)
- **[Git](https://git-scm.com/)**
- **[Docker](https://www.docker.com/)** & **[Docker Compose](https://docs.docker.com/compose/)**
- **[MongoDB](https://www.mongodb.com/)** (or use Docker)
- **[Lavalink](https://github.com/lavalink-devs/Lavalink)** (or use Docker)

### Quick Start

1. **Clone the repository**

```bash
git clone https://github.com/gabrielmaialva33/mahina-bot.git
cd mahina-bot
```

2. **Install dependencies**

```bash
pnpm install
# or npm install
```

3. **Configure environment**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start services with Docker**

```bash
docker-compose up -d
```

5. **Run database migrations**

```bash
pnpm db:push
```

6. **Start the bot**

```bash
pnpm build && pnpm start:max
# or for development
pnpm start:dev
```

<br>

## :gear: Configuration

### Environment Variables

Create a `.env` file with the following configuration:

```env
# Discord Configuration
TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id

# Database
DATABASE_URL=mongodb://localhost:27017/mahina

# Lavalink Nodes
NODES=[{"id":"main","host":"localhost","port":2333,"authorization":"youshallnotpass"}]

# AI Configuration
NVIDIA_API_KEY=your_nvidia_api_key  # Get from build.nvidia.com
OPENAI_API_KEY=your_openai_api_key  # Optional fallback

# Bot Settings
PREFIX=!
DEFAULT_LANGUAGE=EnglishUS
BOT_ACTIVITY=Music & AI
BOT_STATUS=online

# Optional Features
GENIUS_API=your_genius_api_key       # For lyrics
TOPGG=your_topgg_token              # For bot lists
PORT=3050                           # Web dashboard port
```

### Docker Compose

The included `docker-compose.yml` provides:

- Lavalink server
- MongoDB database
- Optional: Bot container

<br>

## :electric_plug: Commands

### 🎵 Music Commands

- `play`, `pause`, `resume`, `stop`, `skip`, `previous`
- `queue`, `nowplaying`, `shuffle`, `loop`, `volume`
- `seek`, `replay`, `remove`, `clear`, `jump`
- `grab`, `move`, `skipto`, `lyrics`

### 🤖 AI Commands

- `chat`, `mahinai`, `code`, `reason`, `stream`
- `model`, `aistatus`, `vision`, `tools`

### 🎛️ Filter Commands

- `filter`, `bassboost`, `nightcore`, `vaporwave`
- `8d`, `distortion`, `karaoke`, `tremolo`, `vibrato`

### 📋 Playlist Commands

- `playlist create`, `playlist add`, `playlist remove`
- `playlist list`, `playlist load`, `playlist delete`

### ⚙️ Config Commands

- `prefix`, `language`, `setup`, `reset`
- `247`, `autoplay`, `voteskip`

### ℹ️ Info Commands

- `help`, `info`, `invite`, `ping`, `stats`
- `node`, `lavalink`, `support`

### 💿 Stream Commands

- `live`, `radio`, `video`, `twitch`
- `mixer`, `podcast`, `soundcloud`

### 👑 Developer Commands

- `eval`, `shell`, `reload`, `restart`
- `blacklist`, `maintenance`, `simulate`

<br>

## :books: API Integration Example

### Using NVIDIA AI in Your Code

```typescript
import { NvidiaAIService } from './services/nvidia_ai_service'

// Initialize service
const aiService = new NvidiaAIService(process.env.NVIDIA_API_KEY)

// Chat with AI
const response = await aiService.chat(
  userId,
  'Explain quantum computing',
  'Make it simple for beginners'
)

// Generate code
const code = await aiService.analyzeCode(
  userId,
  'function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }',
  'javascript',
  'optimize'
)

// Stream responses
for await (const chunk of aiService.chatStream(userId, message)) {
  console.log(chunk) // Print each chunk as it arrives
}
```

<br>

## :memo: License

This project is under the **MIT** license. See [LICENSE](./LICENSE) for details.

<br>

## :handshake: Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<br>

## :star: Support

If you find this project helpful, please give it a star ⭐ to help others discover it!

<br>

## :busts_in_silhouette: Author

Made with ❤️ by **Maia** - A passionate developer who loves cats (but is definitely not one!)

- 📧 Email: [gabrielmaialva33@gmail.com](mailto:gabrielmaialva33@gmail.com)
- 💬 Telegram: [@mrootx](https://t.me/mrootx)
- 🐙 GitHub: [@gabrielmaialva33](https://github.com/gabrielmaialva33)

<br>

<p align="center">
  <img src="https://raw.githubusercontent.com/gabrielmaialva33/gabrielmaialva33/master/assets/gray0_ctp_on_line.svg?sanitize=true" />
</p>

<p align="center">
  &copy; 2017-present <a href="https://github.com/gabrielmaialva33/" target="_blank">Maia</a>
</p>
