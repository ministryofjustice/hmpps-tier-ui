import { defaultClient } from 'applicationinsights'
import { format, startOfDay, subDays, subYears } from 'date-fns'
import { AllPredictorDto, BasePredictorDto, ScoreLevel } from '../data/models/arns'
import { DeliusInputs, Rosh, Tier } from '../data/models/tier'
import {
  calculateLiferAndImprisonmentForPublicProtection,
  calculateMappaAndRiskOfSeriousHarm,
  calculateNonSexualReoffending,
  calculateRegistrationTier,
  calculateSexualReoffending,
  compareTiers,
  maxTier,
} from './calculation'

jest.mock('applicationinsights', () => ({
  defaultClient: {
    trackEvent: jest.fn(),
  },
}))

const mockTrackEvent = jest.mocked(defaultClient.trackEvent)

describe('Tier calculation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('orders tiers from highest to lowest severity', () => {
    expect(compareTiers('A', 'C')).toBeLessThan(0)
    expect(compareTiers('F', 'D')).toBeGreaterThan(0)
    expect(compareTiers('B', 'B')).toBe(0)
  })

  it('returns the highest tier from a mixed list and defaults to G when all tiers are null', () => {
    expect(maxTier(['D', null, 'B', 'F'])).toBe('B')
    expect(maxTier([null, null])).toBe('G')
  })

  it('defaults missing CSRP score to zero for ARP to tier mapping', () => {
    expect(calculateTier(deliusInputs(), predictors({ arp: 90 }))).toBe('D')
  })

  it('defaults missing ARP score to zero for CSRP to tier mapping', () => {
    expect(calculateTier(deliusInputs(), predictors({ csrp: 3.2 }))).toBe('C')
  })

  it.each(arpAndCsrpMatrixCases())('ARP %p and CSRP %p map to tier %p', (arp, csrp, expectedTier) => {
    expect(calculateTier(deliusInputs(), predictors({ arp, csrp }))).toBe(expectedTier)
  })

  it.each(csrpSuppressionCases())(
    'uses combined serious reoffending predictor only when sexual predictors do not suppress it: %s',
    (_description, directSrp, indirectSrp, expectedTier) => {
      expect(
        calculateTier(
          deliusInputs(),
          predictors({
            arp: 90,
            csrp: 6.9,
            directSrp,
            indirectSrp,
          }),
        ),
      ).toBe(expectedTier)
    },
  )

  it.each(ignoredSexualPredictorCases())(
    'ignores sexual predictors without a usable validated band: %s',
    (_description, directSrp, indirectSrp) => {
      expect(
        calculateTier(
          deliusInputs(),
          predictors({
            arp: 75,
            csrp: 1,
            directSrp,
            indirectSrp,
          }),
        ),
      ).toBe('C')
    },
  )

  it.each(directSexualReoffendingCases())(
    'direct score %p with band %p maps to tier %p',
    (score, band, expectedTier) => {
      expect(calculateTier(deliusInputs(), predictors({ directSrp: { score, band } }))).toBe(expectedTier)
    },
  )

  it.each(indirectSexualReoffendingCases())('indirect band %p maps to tier %p', (band, expectedTier) => {
    expect(calculateTier(deliusInputs(), predictors({ indirectSrp: { score: 1, band } }))).toBe(expectedTier)
  })

  it('prefers direct-contact sexual predictor when its score is higher than indirect image predictor', () => {
    expect(
      calculateTier(
        deliusInputs(),
        predictors({
          directSrp: { score: 2.11, band: 'HIGH' },
          indirectSrp: { score: 2.1, band: 'HIGH' },
        }),
      ),
    ).toBe('B')
  })

  it('uses direct-contact predictor when the scores tie', () => {
    expect(
      calculateTier(
        deliusInputs(),
        predictors({
          directSrp: { score: 2.11, band: 'HIGH' },
          indirectSrp: { score: 2.11, band: 'LOW' },
        }),
      ),
    ).toBe('B')
  })

  it('logs when a direct-contact medium-band predictor is below the supported thresholds', () => {
    calculateTier(deliusInputs(), predictors({ directSrp: { score: 0.59, band: 'MEDIUM' } }))
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: 'Unexpected DC-SRP',
      properties: { score: 0.59, band: 'MEDIUM' },
    })
  })

  it.each(mappaAndRoshCases())('mappaPresent=%p and rosh=%p map to tier %p', (hasMappa, rosh, expectedTier) => {
    expect(calculateTier(deliusInputs({ hasMappa, rosh }), predictors())).toBe(expectedTier)
  })

  it('keeps existing tier when ROSH is medium and MAPPA is absent', () => {
    expect(calculateTier(deliusInputs({ hasMappa: false, rosh: 'MEDIUM' }), predictors({ arp: 90, csrp: 1 }))).toBe('B')
  })

  it.each(liferAndReleaseDateCases())(
    'hasLiferIpp=%p and latestReleaseDate=%p map to tier %p',
    (hasLiferIpp, latestReleaseDate, expectedTier) => {
      expect(calculateTier(deliusInputs({ hasLiferIpp, latestReleaseDate }), predictors())).toBe(expectedTier)
    },
  )

  it.each(registrationFlagCases())(
    'domesticAbuse=%p, stalking=%p, childProtection=%p map to tier %p',
    (hasDomesticAbuse, hasStalking, hasChildProtection, expectedTier) => {
      expect(
        calculateTier(
          deliusInputs({
            hasDomesticAbuse,
            hasStalking,
            hasChildProtection,
          }),
          predictors(),
        ),
      ).toBe(expectedTier)
    },
  )

  it('higher tier from earlier rules is not downgraded by later registration logic', () => {
    expect(
      calculateTier(
        deliusInputs({
          hasMappa: true,
          rosh: 'HIGH',
          hasLiferIpp: true,
          latestReleaseDate: format(startOfDay(subYears(new Date(), 2)), 'yyyy-MM-dd'),
          hasDomesticAbuse: true,
          hasStalking: true,
          hasChildProtection: true,
        }),
        predictors({
          arp: 95,
          csrp: 6.9,
          directSrp: { score: 5.31, band: 'VERY_HIGH' },
        }),
      ),
    ).toBe('A')
  })
})

function calculateTier(deliusData: DeliusInputs, riskPredictors: AllPredictorDto = predictors()): Tier {
  const warnings: string[] = []

  return maxTier([
    calculateNonSexualReoffending(riskPredictors).tier,
    calculateSexualReoffending(warnings, riskPredictors).tier,
    calculateMappaAndRiskOfSeriousHarm(deliusData).tier,
    calculateLiferAndImprisonmentForPublicProtection(deliusData).tier,
    calculateRegistrationTier(deliusData.registrations.hasDomesticAbuse, 'E').tier,
    calculateRegistrationTier(deliusData.registrations.hasStalking, 'F').tier,
    calculateRegistrationTier(deliusData.registrations.hasChildProtection, 'F').tier,
  ])
}

function deliusInputs({
  hasMappa = false,
  rosh = null,
  hasLiferIpp = false,
  latestReleaseDate = null,
  hasDomesticAbuse = false,
  hasStalking = false,
  hasChildProtection = false,
}: {
  hasMappa?: boolean
  rosh?: Rosh | null
  hasLiferIpp?: boolean
  latestReleaseDate?: string | null
  hasDomesticAbuse?: boolean
  hasStalking?: boolean
  hasChildProtection?: boolean
} = {}): DeliusInputs {
  return {
    isFemale: false,
    rsrScore: 0,
    ogrsScore: 0,
    hasNoMandate: false,
    previousEnforcementActivity: false,
    latestReleaseDate,
    registrations: {
      hasIomNominal: false,
      hasLiferIpp,
      hasDomesticAbuse,
      hasStalking,
      hasChildProtection,
      complexityFactors: [],
      rosh,
      mappaLevel: null,
      mappaCategory: hasMappa ? 'M1' : null,
      unsupervised: null,
    },
  }
}

function predictors({
  arp,
  csrp,
  directSrp,
  indirectSrp,
}: {
  arp?: number
  csrp?: number
  directSrp?: BasePredictorDto | null
  indirectSrp?: BasePredictorDto | null
} = {}): AllPredictorDto {
  return {
    allReoffendingPredictor:
      arp !== undefined
        ? {
            score: arp,
            band: 'LOW',
            staticOrDynamic: 'STATIC',
          }
        : undefined,
    combinedSeriousReoffendingPredictor:
      csrp !== undefined
        ? {
            score: csrp,
            band: 'LOW' as const,
            staticOrDynamic: 'STATIC' as const,
            algorithmVersion: '2',
          }
        : undefined,
    directContactSexualReoffendingPredictor: directSrp ?? undefined,
    indirectImageContactSexualReoffendingPredictor: indirectSrp ?? undefined,
  }
}

function sexualPredictor(score: number, band?: ScoreLevel | null): BasePredictorDto {
  return { score, band }
}

function arpAndCsrpMatrixCases(): Array<[number, number, Tier]> {
  return [
    [90, 6.9, 'A'],
    [75, 6.9, 'A'],
    [50, 6.9, 'B'],
    [25, 6.9, 'B'],
    [15, 6.9, 'B'],
    [0, 6.9, 'B'],
    [90, 3, 'A'],
    [75, 3, 'B'],
    [50, 3, 'C'],
    [25, 3, 'C'],
    [15, 3, 'C'],
    [0, 3, 'C'],
    [90, 1, 'B'],
    [75, 1, 'C'],
    [50, 1, 'D'],
    [25, 1, 'E'],
    [15, 1, 'E'],
    [0, 1, 'E'],
    [90, 0.5, 'C'],
    [75, 0.5, 'D'],
    [50, 0.5, 'E'],
    [25, 0.5, 'E'],
    [15, 0.5, 'F'],
    [0, 0.5, 'F'],
    [90, 0, 'D'],
    [75, 0, 'D'],
    [50, 0, 'E'],
    [25, 0, 'F'],
    [15, 0, 'F'],
    [0, 0, 'G'],
  ]
}

function csrpSuppressionCases(): Array<[string, BasePredictorDto, BasePredictorDto, Tier]> {
  return [
    ['higher valid indirect score suppresses combined CSRP', { score: 1, band: 'LOW' }, { score: 2, band: 'LOW' }, 'D'],
    ['lower valid indirect score keeps combined CSRP', { score: 2, band: 'LOW' }, { score: 1, band: 'LOW' }, 'A'],
    ['equal valid indirect score keeps combined CSRP', { score: 2, band: 'LOW' }, { score: 2, band: 'LOW' }, 'A'],
    ['higher indirect score without band keeps combined CSRP', { score: 1, band: 'LOW' }, sexualPredictor(2), 'A'],
  ]
}

function ignoredSexualPredictorCases(): Array<[string, BasePredictorDto | null, BasePredictorDto | null]> {
  return [
    ['direct predictor without a band is ignored', sexualPredictor(2.11), null],
    ['direct predictor with NOT_APPLICABLE band is ignored', { score: 2.11, band: 'NOT_APPLICABLE' }, null],
    ['indirect predictor without a band is ignored', null, sexualPredictor(1)],
    ['indirect predictor with NOT_APPLICABLE band is ignored', null, { score: 1, band: 'NOT_APPLICABLE' }],
  ]
}

function directSexualReoffendingCases(): Array<[number, ScoreLevel, Tier]> {
  return [
    [5.31, 'VERY_HIGH', 'A'],
    [0.01, 'VERY_HIGH', 'A'],
    [2.11, 'HIGH', 'B'],
    [1.5, 'HIGH', 'B'],
    [5.31, 'HIGH', 'B'],
    [1.12, 'MEDIUM', 'C'],
    [3.36, 'MEDIUM', 'C'],
    [2.11, 'MEDIUM', 'D'],
    [0.6, 'MEDIUM', 'D'],
    [0.02, 'LOW', 'E'],
  ]
}

function indirectSexualReoffendingCases(): Array<[ScoreLevel, Tier]> {
  return [
    ['VERY_HIGH', 'C'],
    ['HIGH', 'C'],
    ['MEDIUM', 'D'],
    ['LOW', 'E'],
  ]
}

function mappaAndRoshCases(): Array<[boolean, Rosh | null, Tier]> {
  return [
    [true, 'VERY_HIGH', 'A'],
    [true, 'HIGH', 'C'],
    [true, 'MEDIUM', 'D'],
    [true, null, 'E'],
    [false, 'VERY_HIGH', 'C'],
    [false, 'HIGH', 'D'],
    [false, 'MEDIUM', 'G'],
    [false, null, 'G'],
  ]
}

function liferAndReleaseDateCases(): Array<[boolean, string | null, Tier]> {
  const yesterday = format(startOfDay(subDays(new Date(), 1)), 'yyyy-MM-dd')
  const lastYear = format(startOfDay(subYears(new Date(), 1)), 'yyyy-MM-dd')
  return [
    [true, yesterday, 'B'],
    [true, lastYear, 'F'],
    [true, null, 'F'],
    [false, null, 'G'],
    [false, yesterday, 'G'],
  ]
}

function registrationFlagCases(): Array<[boolean, boolean, boolean, Tier]> {
  return [
    [false, false, false, 'G'],
    [true, false, false, 'E'],
    [false, true, false, 'F'],
    [false, false, true, 'F'],
    [true, true, false, 'E'],
    [true, false, true, 'E'],
    [false, true, true, 'F'],
    [true, true, true, 'E'],
  ]
}
