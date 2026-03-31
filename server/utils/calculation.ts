import { isAfter, parseISO, subYears } from 'date-fns'
import { defaultClient } from 'applicationinsights'
import { DeliusInputs, Tier } from '../data/models/tier'
import { AllPredictorDto, BasePredictorDto, ValidPredictor } from '../data/models/arns'
import { StepTitles } from './mappings'

const TIER_PRIORITY: Tier[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const TIER_RANK = Object.fromEntries(TIER_PRIORITY.map((tier, index) => [tier, index])) as Record<Tier, number>

export type StepKey = keyof typeof StepTitles
export interface StepResult {
  tier: Tier | null
  data?: Record<string, unknown>
}
export type StepResults = Record<StepKey, StepResult>
export type StepResultEntry = [StepKey, StepResult]

export function compareTiers(left: Tier, right: Tier): number {
  return TIER_RANK[left] - TIER_RANK[right]
}

export function maxTier(tiers: Array<Tier | null>): Tier {
  return tiers.filter(t => t).sort(compareTiers)[0] ?? 'G'
}

export function calculateNonSexualReoffending(riskPredictors?: AllPredictorDto): StepResult {
  if (!riskPredictors) return { tier: null }
  const arpScore = riskPredictors.allReoffendingPredictor?.score ?? 0
  const csrpScore = riskPredictors.combinedSeriousReoffendingPredictor?.score ?? 0
  const row = findThresholdIndex(csrpScore, [6.9, 3, 1, 0.5, 0])
  const col = findThresholdIndex(arpScore, [90, 75, 50, 25, 15, 0])
  const lookupTable: Tier[][] = [
    ['A', 'A', 'B', 'B', 'B', 'B'],
    ['A', 'B', 'C', 'C', 'C', 'C'],
    ['B', 'C', 'D', 'E', 'E', 'E'],
    ['C', 'D', 'E', 'E', 'F', 'F'],
    ['D', 'D', 'E', 'F', 'F', 'G'],
  ]
  return { tier: lookupTable[row][col] }
}

export function calculateSexualReoffending(warnings: string[], riskPredictors?: AllPredictorDto): StepResult {
  const dcSrp = validatePredictor(riskPredictors?.directContactSexualReoffendingPredictor)

  const data = { riskReduction: false }
  if (dcSrp) {
    if (dcSrp.band === 'VERY_HIGH') return { tier: 'A', data }
    if (dcSrp.band === 'HIGH') return { tier: 'B', data }
    if (dcSrp.band === 'MEDIUM') {
      if (dcSrp.score >= 3.36) return { tier: 'C', data: { ...data, riskReduction: true } }
      if (dcSrp.score >= 2.11) return { tier: 'D', data: { ...data, riskReduction: true } }
      if (dcSrp.score >= 1.12) return { tier: 'C', data }
      if (dcSrp.score >= 0.6) return { tier: 'D', data }
      defaultClient.trackEvent({ name: 'Unexpected DC-SRP', properties: { score: dcSrp.score, band: dcSrp.band } })
      warnings.push(`Unexpected combination of DC-SRP score (${dcSrp.score}) and DC-SRP band (${dcSrp.band})`)
      return { tier: null, data }
    }
    return { tier: 'E', data }
  }
  return { tier: null, data }
}

export function calculateMappaAndRiskOfSeriousHarm(deliusInputs: DeliusInputs): StepResult {
  const { rosh = null, mappaCategory = null } = deliusInputs.registrations
  const data = { rosh, mappaCategory }
  if (mappaCategory) {
    if (rosh === 'VERY_HIGH') return { tier: 'A', data }
    if (rosh === 'HIGH') return { tier: 'C', data }
    if (rosh === 'MEDIUM') return { tier: 'D', data }
    return { tier: 'E', data }
  }
  if (rosh === 'VERY_HIGH') return { tier: 'C', data }
  if (rosh === 'HIGH') return { tier: 'D', data }
  return { tier: null, data }
}

export function calculateLiferAndImprisonmentForPublicProtection(deliusInputs: DeliusInputs): StepResult {
  const { hasLiferIpp } = deliusInputs.registrations
  const inFirstYearOfRelease =
    deliusInputs.latestReleaseDate && isAfter(parseISO(deliusInputs.latestReleaseDate), subYears(new Date(), 1))
  const data = { hasLiferIpp, inFirstYearOfRelease }
  if (hasLiferIpp && inFirstYearOfRelease) return { tier: 'B', data }
  if (hasLiferIpp) return { tier: 'F', data }
  return { tier: null, data }
}

export function calculateRegistrationTier(present: boolean, tier: Tier): StepResult {
  return present ? { tier } : { tier: null }
}

function validatePredictor(predictor?: BasePredictorDto | null): ValidPredictor | null {
  if (!predictor || !predictor.score || predictor.score <= 0 || !predictor.band || predictor.band === 'NOT_APPLICABLE')
    return null
  return {
    score: predictor.score,
    band: predictor.band,
  }
}

function findThresholdIndex(score: number, thresholds: number[]): number {
  const index = thresholds.findIndex(threshold => score >= threshold)
  return index === -1 ? thresholds.length - 1 : index
}
