import { exec } from 'node:child_process'

async function restart() {
  exec('npm start', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting Mahina: ${error}`)
      return
    }
    if (stderr) {
      console.error(`Error starting Mahina: ${stderr}`)
    } else {
      console.log(`Mahina started successfully: ${stdout}`)
    }
  })
}

setTimeout(restart, 5000)
