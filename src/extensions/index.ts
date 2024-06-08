import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { BaseClient } from '#src/common/index'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default async function loadPlugins(client: BaseClient): Promise<void> {
  const extensionsPath = fs
    .readdirSync(path.join(dirname, '/extensions'))
    .filter((file) => fs.statSync(path.join(dirname, `/extensions/${file}`)).isDirectory())

  try {
    for (const dir of extensionsPath) {
      const plugins = fs
        .readdirSync(path.join(dirname, `/extensions/${dir}`))
        .filter((file) => file.endsWith('.js'))

      for (const file of plugins) {
        const { default: plugin } = await import(dirname + `/extensions/${dir}/${file}`)
        plugin.initialize(client)
        client.logger.info(`Loaded plugin: ${plugin.name} v${plugin.version}`)
      }
    }
  } catch (error) {
    client.logger.error('Error loading plugins:', error)
  }
}

export interface BotPlugin {
  name: string
  version: string
  author: string
  description?: string
  initialize: (client: BaseClient) => void
  shutdown?: (client: BaseClient) => void
}
