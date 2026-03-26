import cache from './cache'

describe('cache', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-26T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns the cached value without calling the producer again before expiry', () => {
    const firstProducer = jest.fn(() => ({ value: 'first' }))
    const secondProducer = jest.fn(() => ({ value: 'second' }))

    const first = cache('cache-hit', firstProducer, 1000)
    jest.advanceTimersByTime(500)
    const second = cache('cache-hit', secondProducer, 1000)

    expect(firstProducer).toHaveBeenCalledTimes(1)
    expect(secondProducer).not.toHaveBeenCalled()
    expect(second).toBe(first)
  })

  it('recomputes the value after the ttl expires', () => {
    const firstProducer = jest.fn(() => 'first')
    const secondProducer = jest.fn(() => 'second')

    expect(cache('cache-expiry', firstProducer, 1000)).toBe('first')

    jest.advanceTimersByTime(1001)

    expect(cache('cache-expiry', secondProducer, 1000)).toBe('second')
    expect(firstProducer).toHaveBeenCalledTimes(1)
    expect(secondProducer).toHaveBeenCalledTimes(1)
  })

  it('stores values independently for different keys', () => {
    expect(cache('key-a', () => 'A', 1000)).toBe('A')
    expect(cache('key-b', () => 'B', 1000)).toBe('B')
  })

  it('supports caching promise-returning producers', async () => {
    const producer = jest.fn(async () => ({ A: 1 }))

    const first = cache('async-cache', producer, 1000)
    const second = cache('async-cache', producer, 1000)

    await expect(first).resolves.toEqual({ A: 1 })
    await expect(second).resolves.toEqual({ A: 1 })
    expect(first).toBe(second)
    expect(producer).toHaveBeenCalledTimes(1)
  })
})
