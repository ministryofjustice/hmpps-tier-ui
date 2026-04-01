import { buildSummaryTable, needsRow, row, Table } from './table'
import { StepResults } from './calculation'
import { AllPredictorDto, OASysTierInputs } from '../data/models/arns'

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
    const oasysInputs: OASysTierInputs = {
      assessment: { assessmentId: 1, completedDate: new Date() },
      accommodation: { severity: 'NO_NEED' },
    }
    const table: Table = []
    expect(needsRow(oasysInputs, 'accommodation', [])).toEqual(0)
    expect(table).toEqual([])
  })

  it('adds a row', () => {
    const oasysInputs: OASysTierInputs = {
      assessment: { assessmentId: 1, completedDate: new Date() },
      relationships: { severity: 'SEVERE' },
    }
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

describe('buildSummaryTable', () => {
  it('builds summary rows and highlights the highest tier', () => {
    const calculationSteps: StepResults = {
      reoffending: { tier: 'C' },
      sexualReoffending: { tier: null },
      mappaRosh: { tier: 'A' },
      liferIpp: { tier: 'F' },
      domesticAbuse: { tier: 'E' },
      stalking: { tier: null },
      childProtection: { tier: 'F' },
    }
    const assessment: AllPredictorDto = {}

    expect(buildSummaryTable('X12345', assessment, calculationSteps, 'A')).toEqual([
      [
        {
          html: '<a href="/v3/case/X12345/calculation/#reoffending" class="govuk-link govuk-link--no-visited-state">Reoffending</a>',
        },
        { html: 'C' },
      ],
      [
        {
          html: '<a href="/v3/case/X12345/calculation/#sexualReoffending" class="govuk-link govuk-link--no-visited-state">Sexual reoffending</a>',
        },
        { html: 'Not applicable' },
      ],
      [
        {
          html: '<a href="/v3/case/X12345/calculation/#mappaRosh" class="govuk-link govuk-link--no-visited-state">Risk of serious harm</a>',
        },
        { html: '<strong>A</strong>' },
      ],
      [
        {
          html: '<a href="/v3/case/X12345/calculation/#liferIpp" class="govuk-link govuk-link--no-visited-state">Lifer/IPP</a>',
        },
        { html: 'F' },
      ],
      [
        {
          html: '<a href="/v3/case/X12345/calculation/#domesticAbuse" class="govuk-link govuk-link--no-visited-state">Domestic abuse</a>',
        },
        { html: 'E' },
      ],
      [
        {
          html: '<a href="/v3/case/X12345/calculation/#stalking" class="govuk-link govuk-link--no-visited-state">Stalking</a>',
        },
        { html: 'Not applicable' },
      ],
      [
        {
          html: '<a href="/v3/case/X12345/calculation/#childProtection" class="govuk-link govuk-link--no-visited-state">Child protection</a>',
        },
        { html: 'F' },
      ],
      [{ text: 'Highest tier' }, { html: '<strong>A</strong>' }],
    ])
  })

  it('displays "Not assessed" when there is no assessment', () => {
    const calculationSteps: StepResults = {
      reoffending: { tier: null },
      sexualReoffending: { tier: null },
      mappaRosh: { tier: 'A' },
      liferIpp: { tier: 'F' },
      domesticAbuse: { tier: 'E' },
      stalking: { tier: null },
      childProtection: { tier: 'F' },
    }
    const assessment: AllPredictorDto = null

    const table = buildSummaryTable('X12345', assessment, calculationSteps, 'A')
    expect(table[0]).toEqual([
      {
        html: '<a href="/v3/case/X12345/calculation/#reoffending" class="govuk-link govuk-link--no-visited-state">Reoffending</a>',
      },
      { html: 'Not assessed' },
    ])
    expect(table[1]).toEqual([
      {
        html: '<a href="/v3/case/X12345/calculation/#sexualReoffending" class="govuk-link govuk-link--no-visited-state">Sexual reoffending</a>',
      },
      { html: 'Not assessed' },
    ])
  })
})
