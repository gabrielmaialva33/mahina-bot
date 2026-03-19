import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { config } from 'dotenv'
import { z } from 'zod'

const dirname = path.dirname(fileURLToPath(import.meta.url))

config({ path: path.join(dirname, '../.env') })

const LavalinkNodeSchema = z.object({
  id: z.string(),
  host: z.string(),
  port: z.number(),
  authorization: z.string(),
  secure: z.preprocess(
    (val) => (val === 'true' || val === 'false' ? val === 'true' : val),
    z.boolean().optional()
  ),
  sessionId: z.string().optional(),
  regions: z.string().array().optional(),
  retryAmount: z.number().optional(),
  retryDelay: z.number().optional(),
  requestSignalTimeoutMS: z.number().optional(),
  closeOnError: z.boolean().optional(),
  heartBeatInterval: z.number().optional(),
  enablePingOnStatsCheck: z.boolean().optional(),
})

const envSchema = z.object({
  TOKEN: z.string(),
  CLIENT_ID: z.string(),
  DEFAULT_LANGUAGE: z.string().default('PortugueseBR'),
  PREFIX: z.string().default('!'),
  OWNER_IDS: z.preprocess(
    (val) => (typeof val === 'string' ? JSON.parse(val) : val),
    z.string().array().optional()
  ),
  GUILD_ID: z.string().optional(),
  TOPGG: z.string().optional(),
  KEEP_ALIVE: z.preprocess((val) => val === 'true', z.boolean().default(false)),
  LOG_CHANNEL_ID: z.string().optional(),
  LOG_COMMANDS_ID: z.string().optional(),
  BOT_STATUS: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        return val.toLowerCase()
      }
      return val
    },
    z.enum(['online', 'idle', 'dnd', 'invisible']).default('online')
  ),
  BOT_ACTIVITY: z.string().default('MahinaBot'),
  BOT_ACTIVITY_TYPE: z.preprocess((val) => {
    if (typeof val === 'string') {
      return Number.parseInt(val, 10)
    }
    return val
  }, z.number().default(0)),
  ENABLE_MUSIC: z.preprocess((val) => val !== 'false', z.boolean().default(true)),
  ENABLE_AI: z.preprocess((val) => val !== 'false', z.boolean().default(true)),
  ENABLE_SELFBOT: z.preprocess((val) => val === 'true', z.boolean().default(false)),
  DATABASE_URL: z.string().default('mongodb://localhost:27017/mahina'),
  AI_QUEUE_ENABLED: z.preprocess((val) => val !== 'false', z.boolean().default(true)),
  REDIS_URL: z.string().optional().default('redis://:change-me-redis-password@127.0.0.1:6380'),
  REDIS_PASSWORD: z.string().default('change-me-redis-password'),
  SEARCH_ENGINE: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        return val.toLowerCase()
      }
      return val
    },
    z
      .enum([
        'youtube',
        'youtubemusic',
        'soundcloud',
        'spotify',
        'apple',
        'deezer',
        'yandex',
        'jiosaavn',
      ])
      .default('youtube')
  ),
  NODES: z.preprocess(
    (val) => (typeof val === 'string' ? JSON.parse(val) : val),
    z.array(LavalinkNodeSchema)
  ),
  GENIUS_API: z.string().optional(),
  SELF_USER_TOKEN: z.string().optional(),
  YTDL_BIN_PATH: z.string().optional().default(''),
  PORT: z
    .string()
    .default('3050')
    .transform((val) => Number.parseInt(val, 10)),
  NVIDIA_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  AI_PRIMARY_MODEL: z.string().default('nvidia/llama-3.1-nemotron-ultra-253b-v1'),
  AI_FAST_MODEL: z.string().default('llama-3.3-70b-versatile'),
})

type Env = z.infer<typeof envSchema>

export const env: Env = envSchema.parse(process.env)
