import fs from 'node:fs'
import { rm } from 'node:fs/promises'
import path from 'node:path'

async function clean() {
  try {
    const distPath = path.resolve('dist')
    if (fs.existsSync(distPath)) {
      await rm(distPath, { recursive: true, force: true })
    }
  } catch (error) {
    console.error('Error while cleaning dist folder:', error)
    process.exit(1)
  }
}

clean()
