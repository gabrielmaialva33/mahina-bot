import { platform } from 'node:os'

export const functions = {
  importURLToString: (url: string): string => {
    const pathArray = new URL(url).pathname.split(/[\/\\]/g).filter(Boolean)
    const path = pathArray.slice(0, -1).join('/')

    return decodeURIComponent(`${platform() === 'win32' ? '' : '/'}${path}`)
  },
}
