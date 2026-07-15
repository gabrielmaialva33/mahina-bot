import { describe, expect, it, vi } from 'vitest'

import AutocompleteCoordinator from '#utils/functions/autocomplete_coordinator'

describe('AutocompleteCoordinator', () => {
  it('lets only the latest request for a user reach the search backend', async () => {
    vi.useFakeTimers()
    const coordinator = new AutocompleteCoordinator<string>({ delayMs: 200, ttlMs: 30_000 })

    const first = coordinator.wait('guild:user', 'livid')
    const second = coordinator.wait('guild:user', 'livid jawbox')
    await vi.advanceTimersByTimeAsync(200)

    await expect(first).resolves.toEqual({ status: 'stale' })
    await expect(second).resolves.toMatchObject({ status: 'ready' })
    vi.useRealTimers()
  })

  it('returns cached results without waiting again', async () => {
    vi.useFakeTimers()
    const coordinator = new AutocompleteCoordinator<string>({ delayMs: 200, ttlMs: 30_000 })

    const pending = coordinator.wait('guild:user', 'livid')
    await vi.advanceTimersByTimeAsync(200)
    const ready = await pending
    expect(ready.status).toBe('ready')
    if (ready.status !== 'ready') throw new Error('expected ready autocomplete request')
    coordinator.complete(ready, 'cached-choice')

    await expect(coordinator.wait('guild:user', 'livid')).resolves.toEqual({
      status: 'cached',
      value: 'cached-choice',
    })
    vi.useRealTimers()
  })
})
