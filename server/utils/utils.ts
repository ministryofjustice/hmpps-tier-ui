import { SanitisedError } from '@ministryofjustice/hmpps-rest-client'
import { auditService } from '@ministryofjustice/hmpps-audit-client'
import { randomUUID } from 'crypto'
import config from '../config'
import { Tier } from '../data/models/tier'

const properCase = (word: string): string =>
  word.length >= 1 ? word[0].toUpperCase() + word.toLowerCase().slice(1) : word

const isBlank = (str: string): boolean => !str || /^\s*$/.test(str)

/**
 * Converts a name (first name, last name, middle name, etc.) to proper case equivalent, handling double-barreled names
 * correctly (i.e. each part in a double-barreled is converted to proper case).
 * @param name name to be converted.
 * @returns name converted to proper case.
 */
const properCaseName = (name: string): string => (isBlank(name) ? '' : name.split('-').map(properCase).join('-'))

export const convertToTitleCase = (sentence: string): string =>
  isBlank(sentence) ? '' : sentence.split(' ').map(properCaseName).join(' ')

export const initialiseName = (fullName?: string): string | null => {
  // this check is for the authError page
  if (!fullName) return null

  const array = fullName.split(' ')
  return `${array[0][0]}. ${array.reverse()[0]}`
}

export const ignore404 = <E>(path: string, verb: string, error: SanitisedError<E>): null => {
  if (error.responseStatus === 404) return null
  throw error
}

export const joinWithAnd = (values: string[]): string => {
  const lower = values.map(s => s[0].toLowerCase() + s.slice(1))
  if (lower.length <= 1) return lower[0] ?? ''
  if (lower.length === 2) return `${lower[0]} and ${lower[1]}`
  return `${lower.slice(0, -1).join(', ')} and ${lower.at(-1)}`
}

export const audit = async (action: string, crn: string, username: string) => {
  if (config.audit.enabled) {
    await auditService.sendAuditMessage({
      action,
      who: username,
      subjectId: crn,
      subjectType: 'CRN',
      correlationId: randomUUID(),
      service: 'hmpps-tier-ui',
    })
  }
}

export const displayTier = (tier: Tier): string => {
  if (tier === 'NOT_SUPERVISED') return 'Not supervised'
  if (tier === 'MISSING') return 'Missing'
  return tier
}
