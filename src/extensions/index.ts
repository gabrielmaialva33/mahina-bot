import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import MahinaBot from '#common/mahina_bot'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default async function loadPlugins(client: MahinaBot): Promise<void> {
  const pluginFiles = fs
    .readdirSync(path.join(dirname, '/extensions'))
    .filter((file) => fs.statSync(path.join(dirname, `/extensions/${file}`)).isDirectory())

  try {
    for (const dir of pluginFiles) {
      const pluginsFolder = path.join(dirname, `/extensions/${dir}`)
      const plugins = fs.readdirSync(pluginsFolder).filter((file) => file.endsWith('.js'))

      for (const file of plugins) {
        const { default: plugin } = await import(pluginsFolder + `/${file}`)
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
  initialize: (client: MahinaBot) => void
  shutdown?: (client: MahinaBot) => void
}
