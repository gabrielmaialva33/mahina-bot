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
  DATABASE_URL: z.string().optional(),
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
})

type Env = z.infer<typeof envSchema>

export const env: Env = envSchema.parse(process.env)

for (const key in env)
  if (!(key in env))
    throw new Error(`Missing env variable: ${key}. Please check the .env file and try again.`)
