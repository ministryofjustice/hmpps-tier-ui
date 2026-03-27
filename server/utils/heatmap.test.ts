import heat from './heatmap'

describe('heat', () => {
  it('returns the nearest higher heat bucket for non-max values', () => {
    expect(heat({ A: 100, B: 34 }, 'B')).toBe(40)
  })

  it('returns a minimum heat bucket of 10', () => {
    expect(heat({ A: 100, B: 1 }, 'B')).toBe(10)
  })

  it('returns 100 for the maximum value', () => {
    expect(heat({ A: 75, B: 75 }, 'A')).toBe(100)
  })
})
