interface AutocompleteCoordinatorOptions {
  delayMs: number
  ttlMs: number
}

interface ReadyAutocompleteRequest {
  status: 'ready'
  scope: string
  query: string
  token: number
}

type AutocompleteWaitResult<T> =
  | ReadyAutocompleteRequest
  | { status: 'stale' }
  | { status: 'cached'; value: T }

interface CacheEntry<T> {
  expiresAt: number
  value: T
}

export default class AutocompleteCoordinator<T> {
  private readonly cache = new Map<string, CacheEntry<T>>()
  private readonly generations = new Map<string, number>()

  constructor(private readonly options: AutocompleteCoordinatorOptions) {}

  async wait(scope: string, query: string): Promise<AutocompleteWaitResult<T>> {
    const normalizedQuery = query.trim().toLowerCase()
    const cached = this.cache.get(normalizedQuery)
    if (cached && cached.expiresAt > Date.now()) {
      return { status: 'cached', value: cached.value }
    }
    if (cached) this.cache.delete(normalizedQuery)

    const token = (this.generations.get(scope) ?? 0) + 1
    this.generations.set(scope, token)
    await new Promise((resolve) => setTimeout(resolve, this.options.delayMs))

    if (this.generations.get(scope) !== token) {
      return { status: 'stale' }
    }

    return { status: 'ready', scope, query: normalizedQuery, token }
  }

  complete(request: ReadyAutocompleteRequest, value: T): void {
    if (this.generations.get(request.scope) === request.token) {
      this.generations.delete(request.scope)
    }
    this.cache.set(request.query, {
      expiresAt: Date.now() + this.options.ttlMs,
      value,
    })
  }

  cancel(request: ReadyAutocompleteRequest): void {
    if (this.generations.get(request.scope) === request.token) {
      this.generations.delete(request.scope)
    }
  }
}
