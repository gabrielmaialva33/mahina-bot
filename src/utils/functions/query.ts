const YOUTUBE_HOSTS = /^(?:www\.|music\.|m\.)?youtube\.com$/i

export function sanitizeQuery(query: string): string {
  if (!query) return query
  const trimmed = query.trim()
  if (!/^https?:\/\//i.test(trimmed)) return trimmed

  try {
    const url = new URL(trimmed)
    if (!YOUTUBE_HOSTS.test(url.hostname) && url.hostname !== 'youtu.be') return trimmed

    const list = url.searchParams.get('list') ?? ''
    if (list.startsWith('RD')) url.searchParams.delete('list')
    url.searchParams.delete('start_radio')
    url.searchParams.delete('index')
    return url.toString()
  } catch {
    return trimmed
  }
}
