import { BaseClient } from '#common/base_client'

interface EventOptions {
  name: string
  one?: boolean
}

export class Event {
  client: BaseClient
  one: boolean
  file: string
  name: string
  file_name: string

  constructor(client: BaseClient, file: string, options: EventOptions) {
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
