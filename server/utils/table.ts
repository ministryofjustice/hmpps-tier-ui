import { Abbreviation, NeedsDescriptions, NeedsWeighting, StepTitles } from './mappings'
import { Tier } from '../data/models/tier'
import { StepKey, StepResultEntry, StepResults } from './calculation'
import { OASysSections, OASysTierInputs } from '../data/models/arns'

export type TableCell = { text?: string; html?: string; colspan?: number; format?: string }
export type Table = TableCell[][]

const SevereTag = '<span class="govuk-tag govuk-tag--red" title="Severe need">SEVERE</span>'

export function row(input: string | Abbreviation, value?: string, points?: string) {
  const items = []
  let colspan = 1
  if (!value) colspan = 2
  if (!value && !points) colspan = 3
  if (typeof input === 'string') {
    items.push({ text: input, colspan })
  } else {
    items.push({ html: `<abbr title="${input.text}">${input.abbreviation}</abbr>`, colspan })
  }
  if (value) items.push({ html: value })
  if (points) items.push({ html: points, format: 'numeric' })
  return items
}

export function needsRow(oasysInputs: OASysTierInputs, key: keyof OASysSections, table: Table) {
  const section = oasysInputs[key]
  if (!section || section.severity === 'NO_NEED') return 0
  const isSevere = section.severity === 'SEVERE'
  const label = `${NeedsDescriptions[key]} ${isSevere ? SevereTag : ''}`
  const score = NeedsWeighting[key] * (isSevere ? 2 : 1)
  table.push(row('', label, `+${score}`))
  return score
}

export function buildSummaryTable(crn: string, calculationSteps: StepResults, derivedTier: Tier): Table {
  return [
    ...Object.entries(calculationSteps).map(([key, result]: StepResultEntry) => [
      {
        html: `<a href="/v3/case/${crn}/calculation/#${key}" class="govuk-link govuk-link--no-visited-state">${StepTitles[key]}</a>`,
      },
      {
        html: result.tier === derivedTier ? `<strong>${result.tier}</strong>` : (result.tier ?? noTierText(key)),
      },
    ]),
    [{ text: 'Highest tier' }, { html: `<strong>${derivedTier}</strong>` }],
  ]
}

function noTierText(key: StepKey) {
  return ['reoffending'].includes(key) ? 'Not assessed' : 'Not applicable'
}
