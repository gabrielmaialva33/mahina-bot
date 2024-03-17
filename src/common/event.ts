import { Mahina } from '#common/mahina'

export class Event {
  client: Mahina
  one: boolean
  file: string
  name: string
  file_name: string
  constructor(client: Mahina, file: string, options: EventOptions) {
    this.client = client
    this.file = file
    this.name = options.name
    this.one = options.one || false
    this.file_name = file.split('.')[0]
  }
  async run(..._args: any[]): Promise<any> {
    return await Promise.resolve()
  }
}

interface EventOptions {
  name: string
  one?: boolean
}
