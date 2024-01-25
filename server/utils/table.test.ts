import { row, needsRow, Table } from './table'
import { OASysTierInputs } from '../data/arnsApiClient'

describe('row', () => {
  it('handles a single column', () => {
    expect(row('test')).toEqual([{ text: 'test', colspan: 3 }])
  })

  it('handles two columns', () => {
    expect(row('test', 'value')).toEqual([{ text: 'test', colspan: 1 }, { html: 'value' }])
  })

  it('third column is numeric', () => {
    expect(row('test', 'value', '123')).toEqual([
      { text: 'test', colspan: 1 },
      { html: 'value' },
      { html: '123', format: 'numeric' },
    ])
  })

  it('expands abbreviations', () => {
    const input = { text: 'example', abbreviation: 'ex' }
    expect(row(input)).toEqual([{ html: '<abbr title="example">ex</abbr>', colspan: 3 }])
  })
})

describe('needsRow', () => {
  it('doesn\'t add a row or calculate a score when severity is "NO_NEED"', () => {
    const oasysInputs: OASysTierInputs = { accommodation: { severity: 'NO_NEED' } }
    const table: Table = []
    expect(needsRow(oasysInputs, 'accommodation', [])).toEqual(0)
    expect(table).toEqual([])
  })

  it('adds a row', () => {
    const oasysInputs: OASysTierInputs = { relationships: { severity: 'SEVERE' } }
    const table: Table = []
    expect(needsRow(oasysInputs, 'relationships', table)).toEqual(2)
    expect(table).toEqual([
      [
        { text: '', colspan: 1 },
        { html: 'Relationships <span class="govuk-tag govuk-tag--red" title="Severe need">SEVERE</span>' },
        { html: '+2', format: 'numeric' },
      ],
    ])
  })
})
