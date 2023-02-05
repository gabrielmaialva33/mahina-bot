import 'dotenv/config'

import { cleanEnv, num, str } from 'envalid'

export const EnvConfig = cleanEnv(process.env, {
  API_ID: num({}),
  API_HASH: str({}),
  BOT_TOKEN: str({}),
  STRING_SESSION_1: str({}),
  STRING_SESSION_2: str({}),
  DATABASE_PATH: str({}),
})
