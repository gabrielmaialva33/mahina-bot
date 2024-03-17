import * as os from 'node:os'

const platform = os.platform()
const arch = os.arch()
const release = os.release()
const cpus = os.cpus()
const totalmem = os.totalmem()
const freemem = os.freemem()
const hostname = os.hostname()
const uptime = os.uptime()
const userInfo = os.userInfo()

export function systemInfo(name: string) {
  return `
    Olá ${name}!  Aqui estão algumas informações sobre meu sistema:

    platform: ${platform}
    arch: ${arch}
    release: ${release}
    cpus: ${cpus.length}
    totalmem: ${totalmem / 1024 / 1024 / 1024} GB
    freemem: ${freemem / 1024 / 1024 / 1024} GB
    hostname: ${hostname}
    uptime: ${uptime / 60} minutes
    user: ${userInfo.username}
  `
}
