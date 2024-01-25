import { mappaDescription } from './mappings'

describe('mappaDescription', () => {
  it('returns "Not found" if no level code is provided', () => {
    expect(mappaDescription()).toEqual('Not found')
  })

  it('replaces the "M" with "Level" in the level code', () => {
    expect(mappaDescription('M1')).toEqual('Level 1')
  })
})
