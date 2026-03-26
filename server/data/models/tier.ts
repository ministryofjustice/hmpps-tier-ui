import { OGRS4Predictors } from './arns'

export type Tier = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
export type Rosh = 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
export type MappaLevel = 'M1' | 'M2' | 'M3'
export type MappaCategory = 'M1' | 'M2' | 'M3' | 'M4'

export interface TierCalculationV3 {
  tierScore: string
  calculationId: string
  calculationDate: string
  data: {
    tier: Tier
    deliusInputs: DeliusInputs
    riskPredictors: OGRS4Predictors
    calculationVersion: string
  }
  changeReason?: string
}

export interface TierCalculationV2 {
  tierScore: string
  calculationId: string
  calculationDate: string
  data: {
    protect: TierLevel
    change: TierLevel
    calculationVersion: string
  }
  changeReason?: string
}

export interface TierLevel {
  tier: string
  points: number
  pointsBreakdown: Record<CalculationRule, number>
}

export interface TierCount {
  protectLevel: string
  changeLevel: number
  count: number
}

export type CalculationRule =
  | 'NO_MANDATE_FOR_CHANGE'
  | 'NO_VALID_ASSESSMENT'
  | 'NEEDS'
  | 'OGRS'
  | 'IOM'
  | 'RSR'
  | 'ROSH'
  | 'MAPPA'
  | 'COMPLEXITY'
  | 'ADDITIONAL_FACTORS_FOR_WOMEN'

export interface DeliusInputs {
  isFemale: boolean
  rsrScore: number
  ogrsScore: number
  hasNoMandate: boolean
  registrations: Registrations
  previousEnforcementActivity: boolean
  latestReleaseDate?: string | null
}

export interface Registrations {
  hasIomNominal: boolean
  hasLiferIpp: boolean
  hasDomesticAbuse: boolean
  hasStalking: boolean
  hasChildProtection: boolean
  complexityFactors: string[]
  rosh?: Rosh | null
  mappaLevel?: MappaLevel | null
  mappaCategory?: MappaCategory | null
  unsupervised?: boolean | null
}
