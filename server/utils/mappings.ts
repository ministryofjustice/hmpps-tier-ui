import { OASysSections } from '../data/arnsApiClient'

export type Abbreviation = {
  abbreviation: string
  text: string
}

export const Abbreviations = {
  ROSH: { abbreviation: 'RoSH', text: 'Risk of Serious Harm' },
  RSR: { abbreviation: 'RSR', text: 'Risk of Serious Recidivism' },
  MAPPA: { abbreviation: 'MAPPA', text: 'Multi-Agency Public Protection Arrangements' },
  IOM: { abbreviation: 'IOM', text: 'Integrated Offender Management' },
  OGRS: { abbreviation: 'OGRS', text: 'Offender Group Reconviction Scale' },
}

export const ComplexityFactors = {
  RMDO: 'Mental health',
  ALSH: 'Attempted suicide or self-harm',
  RVLN: 'Vulnerability issues',
  RCCO: 'Child concerns',
  RCPR: 'Child protection',
  RCHD: 'Risk to children',
  RPIR: 'Public interest',
  RVAD: 'Adult at risk',
  STRG: 'Street gangs',
  RTAO: 'Terrorism',
}

/**
 * Infer description from level code (e.g. 'M1' -> 'Level 1')
 * @param levelCode
 */
export function mappaDescription(levelCode?: string): string {
  if (!levelCode) return 'Not found'
  return levelCode.replace('M', 'Level ')
}

export const NeedsDescriptions: Record<keyof OASysSections, string> = {
  accommodation: 'Accommodation',
  alcoholMisuse: 'Alcohol misuse',
  attitudes: 'Attitudes',
  drugMisuse: 'Drug misuse',
  educationTrainingEmployability: 'Education, training and employability',
  lifestyleAndAssociates: 'Lifestyle and associates',
  relationships: 'Relationships',
  thinkingAndBehaviour: 'Thinking and behaviour',
}

export const NeedsWeighting: Record<keyof OASysSections, number> = {
  accommodation: 1,
  alcoholMisuse: 1,
  attitudes: 2,
  drugMisuse: 1,
  educationTrainingEmployability: 1,
  lifestyleAndAssociates: 1,
  relationships: 1,
  thinkingAndBehaviour: 2,
}
