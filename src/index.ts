import * as fs from 'node:fs'

import { ThemeSelector } from '#utils/theme_selector'
import Logger from '#common/logger'
import { shardStart } from '#src/shard'

const logger = new Logger()

const theme = new ThemeSelector()

/**
 * Sets the console window title.
 * @param title - The new title for the console window.
 */
function setConsoleTitle(title: string): void {
  // Write the escape sequence to change the console title
  process.stdout.write(`\x1b]0;${title}\x07`)
}

try {
  if (!fs.existsSync('./src/utils/mahina_logo.txt')) {
    logger.error('mahina_logo.txt file is missing')
    process.exit(1)
  }
  console.clear()
  // Set a custom title for the console window
  setConsoleTitle('MahinaBot')
  const logFile = fs.readFileSync('./src/utils/mahina_logo.txt', 'utf-8')
  console.log(theme.purpleNeon(logFile))
  shardStart(logger)
} catch (err) {
  logger.error('[CLIENT] An error has occurred:', err)
}
