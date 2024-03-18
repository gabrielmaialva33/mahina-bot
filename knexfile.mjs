import { SQLITE_CONFIG } from './build/database/sqlite.config.js'
import path from 'node:path'

export default {
  ...SQLITE_CONFIG,
  migrations: {
    ...SQLITE_CONFIG.migrations,
    directory: path.join(process.cwd(), 'build', 'database', 'migrations'),
  },
  seeds: {
    ...SQLITE_CONFIG.seeds,
    directory: path.join(process.cwd(), 'build', 'database', 'seeds'),
  },
}
