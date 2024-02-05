import { OASysSections, OASysTierInputs } from '../data/arnsApiClient'
import { Abbreviation, NeedsDescriptions, NeedsWeighting } from './mappings'

export type Table = { text?: string; html?: string; colspan?: number; format?: string }[][]

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
