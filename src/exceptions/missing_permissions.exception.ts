export class MissingPermissionsException {
  message = 'Missing permissions:'

  constructor(public permissions: string[]) {}

  toString() {
    return `${this.message} ${this.permissions.join(', ')}`
  }
}
