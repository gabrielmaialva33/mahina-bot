import { SQLITE_CONFIG } from './build/database/sqlite.config.js'

export default {
  ...SQLITE_CONFIG,
  migrations: {
    ...SQLITE_CONFIG.migrations,
    directory: './build/database/migrations'
  },
  seeds: {
    ...SQLITE_CONFIG.seeds,
    directory: './build/database/seeds'
  }
}
