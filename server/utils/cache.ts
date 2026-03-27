type CachedItem = {
  value: unknown
  expiry: number
}

const inMemoryCache: Record<string, CachedItem> = {}

export default function cache<T>(key: string, producer: () => T, ttlMs: number = 60 * 60 * 1000): T {
  if (inMemoryCache[key] && inMemoryCache[key].expiry > Date.now()) {
    return inMemoryCache[key].value as T
  }

  const value = producer()
  inMemoryCache[key] = { value, expiry: Date.now() + ttlMs }
  return value
}
