import { telemetry } from '@ministryofjustice/hmpps-azure-telemetry'
import { format, startOfDay, subDays, subYears } from 'date-fns'
import { AllPredictorDto, BasePredictorDto, OGRS4Predictors, ScoreLevel } from '../data/models/arns'
import { DeliusInputs, OASysInputs, Rosh, Tier } from '../data/models/tier'
import {
  calculate,
  calculateLiferAndImprisonmentForPublicProtection,
  calculateMappaAndRiskOfSeriousHarm,
  calculateNonSexualReoffending,
  calculateSexualReoffending,
  calculateTierIfPresent,
  StepResults,
} from './calculation'

jest.mock('@ministryofjustice/hmpps-azure-telemetry', () => ({
  telemetry: {
    trackEvent: jest.fn(),
  },
}))

const mockTrackEvent = jest.mocked(telemetry.trackEvent)

describe('Tier calculation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns MISSING when no reoffending predictors are available', () => {
    const result = calculateTier(deliusInputs(), oasysInputs({ predictorsOutput: undefined }))

    expect(result.tier).toBe('MISSING')
    expect(result.stepResults.reoffending).toEqual({ tier: null })
  })

  it('returns MISSING when no CSRP score available', () => {
    expect(calculateTier(deliusInputs(), oasysInputs({ arp: 90 })).tier).toBe('MISSING')
  })

  it('returns MISSING when no ARP score available', () => {
    expect(calculateTier(deliusInputs(), oasysInputs({ csrp: 3.2 })).tier).toBe('MISSING')
  })

  it('returns NOT_SUPERVISED when there is no active event', () => {
    const result = calculateTier(deliusInputs({ hasActiveEvent: false }), oasysInputs({ arp: 90, csrp: 6.9 }))

    expect(result.tier).toBe('NOT_SUPERVISED')
    expect(result.stepResults.reoffending).toEqual({ tier: 'A' })
  })

  it.each(arpAndCsrpMatrixCases())('ARP %p and CSRP %p map to tier %p', (arp, csrp, expectedTier) => {
    const result = calculateTier(deliusInputs(), oasysInputs({ arp, csrp }))

    expect(result.tier).toBe(expectedTier)
    expect(result.stepResults.reoffending).toEqual({ tier: expectedTier })
  })

  it.each(ignoredSexualPredictorCases())(
    'ignores sexual predictors without a usable validated band: %s',
    (_description, directSrp) => {
      const result = calculateTier(
        deliusInputs(),
        oasysInputs({
          arp: 75,
          csrp: 1,
          directSrp,
        }),
      )

      expect(result.tier).toBe('C')
      expect(result.stepResults.sexualReoffending).toEqual({ tier: null, data: { riskReduction: false } })
    },
  )

  it.each(directSexualReoffendingCases())(
    'direct score %p with band %p maps to tier %p',
    (score, band, expectedTier, riskReduction) => {
      const result = calculateTier(deliusInputs(), oasysInputs({ arp: 0, csrp: 0, directSrp: { score, band } }))

      expect(result.tier).toBe(expectedTier)
      expect(result.stepResults.sexualReoffending).toEqual({
        tier: expectedTier,
        data: { riskReduction },
      })
    },
  )

  it('logs and warns when a direct-contact medium-band predictor is below the supported thresholds', () => {
    const warnings: string[] = []

    const result = calculate(
      warnings,
      deliusInputs(),
      oasysInputs({ arp: 0, csrp: 0, directSrp: { score: 0.59, band: 'MEDIUM' } }),
    )

    expect(result.tier).toBe('G')
    expect(result.stepResults.sexualReoffending).toEqual({ tier: null, data: { riskReduction: false } })
    expect(mockTrackEvent).toHaveBeenCalledWith('Unexpected DC-SRP', { score: 0.59, band: 'MEDIUM' })
    expect(warnings).toEqual(['Unexpected combination of DC-SRP score (0.59) and DC-SRP band (MEDIUM)'])
  })

  it.each(mappaAndRoshCases())('mappaPresent=%p and rosh=%p map to tier %p', (hasMappa, rosh, expectedTier) => {
    const result = calculateTier(deliusInputs({ hasMappa, rosh }), oasysInputs())

    expect(result.tier).toBe(expectedTier)
    expect(result.stepResults.mappaRosh).toEqual({
      tier: expectedTier === 'G' ? null : expectedTier,
      data: { rosh, mappaCategory: hasMappa ? 'M1' : null },
    })
  })

  it('keeps existing tier when ROSH is medium and MAPPA is absent', () => {
    expect(
      calculateTier(deliusInputs({ hasMappa: false, rosh: 'MEDIUM' }), oasysInputs({ arp: 90, csrp: 1 })).tier,
    ).toBe('B')
  })

  it.each(liferAndReleaseDateCases())(
    'hasLiferIpp=%p and latestReleaseDate=%p map to tier %p',
    (hasLiferIpp, latestReleaseDate, expectedTier) => {
      const result = calculateTier(deliusInputs({ hasLiferIpp, latestReleaseDate }), oasysInputs())

      expect(result.tier).toBe(expectedTier)
      expect(result.stepResults.liferIpp).toEqual({
        tier: expectedTier === 'G' ? null : expectedTier,
        data: { hasLiferIpp, latestReleaseDate },
      })
    },
  )

  it.each(registrationFlagCases())(
    'domesticAbuse=%p, stalking=%p, childProtection=%p map to tier %p',
    (hasDomesticAbuse, hasStalking, hasChildProtection, expectedTier) => {
      const result = calculateTier(
        deliusInputs({
          hasDomesticAbuse,
          hasStalking,
          hasChildProtection,
        }),
        oasysInputs(),
      )

      expect(result.tier).toBe(expectedTier)
      expect(result.stepResults.domesticAbuse).toEqual({ tier: hasDomesticAbuse ? 'E' : null })
      expect(result.stepResults.stalking).toEqual({ tier: hasStalking ? 'F' : null })
      expect(result.stepResults.childProtection).toEqual({ tier: hasChildProtection ? 'F' : null })
    },
  )

  it.each(sexualOffenceCases())(
    'everCommittedSexualOffence=%p maps to tier %p',
    (everCommittedSexualOffence, expectedTier) => {
      const result = calculateTier(deliusInputs(), oasysInputs({ arp: 0, csrp: 0, everCommittedSexualOffence }))

      expect(result.tier).toBe(expectedTier)
      expect(result.stepResults.sexualOffences).toEqual({ tier: everCommittedSexualOffence ? 'E' : null })
    },
  )

  it('returns step results for every factor used by the V3 case routes', () => {
    const result = calculateTier(
      deliusInputs({
        hasMappa: true,
        rosh: 'HIGH',
        hasLiferIpp: true,
        latestReleaseDate: format(startOfDay(subDays(new Date(), 1)), 'yyyy-MM-dd'),
        hasDomesticAbuse: true,
        hasStalking: true,
        hasChildProtection: true,
      }),
      oasysInputs({
        arp: 50,
        csrp: 1,
        directSrp: { score: 2.11, band: 'MEDIUM' },
        everCommittedSexualOffence: true,
      }),
    )

    expect(result.stepResults).toEqual<StepResults>({
      reoffending: { tier: 'D' },
      sexualReoffending: { tier: 'D', data: { riskReduction: true } },
      mappaRosh: { tier: 'C', data: { rosh: 'HIGH', mappaCategory: 'M1' } },
      liferIpp: { tier: 'B', data: { hasLiferIpp: true, latestReleaseDate: expect.any(String) } },
      domesticAbuse: { tier: 'E' },
      stalking: { tier: 'F' },
      childProtection: { tier: 'F' },
      sexualOffences: { tier: 'E' },
    })
    expect(result.tier).toBe('B')
  })

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
        oasysInputs({
          arp: 95,
          csrp: 6.9,
          directSrp: { score: 5.31, band: 'VERY_HIGH' },
          everCommittedSexualOffence: true,
        }),
      ).tier,
    ).toBe('A')
  })
})

describe('Tier calculation steps', () => {
  it('calculates non-sexual reoffending from predictor output', () => {
    expect(calculateNonSexualReoffending(predictors({ arp: 90, csrp: 6.9 }))).toEqual({ tier: 'A' })
  })

  it('returns null non-sexual reoffending tier when predictor output is missing', () => {
    expect(calculateNonSexualReoffending(undefined)).toEqual({ tier: null })
  })

  it('calculates sexual reoffending from direct-contact predictor output', () => {
    expect(calculateSexualReoffending([], predictors({ directSrp: { score: 3.36, band: 'MEDIUM' } }))).toEqual({
      tier: 'C',
      data: { riskReduction: true },
    })
  })

  it('calculates MAPPA and risk of serious harm', () => {
    expect(calculateMappaAndRiskOfSeriousHarm(deliusInputs({ hasMappa: true, rosh: 'VERY_HIGH' }))).toEqual({
      tier: 'A',
      data: { rosh: 'VERY_HIGH', mappaCategory: 'M1' },
    })
  })

  it('calculates lifer and imprisonment for public protection', () => {
    const latestReleaseDate = format(startOfDay(subDays(new Date(), 1)), 'yyyy-MM-dd')

    expect(
      calculateLiferAndImprisonmentForPublicProtection(deliusInputs({ hasLiferIpp: true, latestReleaseDate })),
    ).toEqual({
      tier: 'B',
      data: { hasLiferIpp: true, latestReleaseDate },
    })
  })

  it('calculates registration tier when a factor is present', () => {
    expect(calculateTierIfPresent(true, 'E')).toEqual({ tier: 'E' })
    expect(calculateTierIfPresent(false, 'E')).toEqual({ tier: null })
  })
})

function calculateTier(deliusData: DeliusInputs, oasysData: OASysInputs = oasysInputs()) {
  return calculate([], deliusData, oasysData)
}

function deliusInputs({
  hasMappa = false,
  rosh = null,
  hasLiferIpp = false,
  latestReleaseDate = null,
  hasDomesticAbuse = false,
  hasStalking = false,
  hasChildProtection = false,
  hasActiveEvent = true,
}: {
  hasMappa?: boolean
  rosh?: Rosh | null
  hasLiferIpp?: boolean
  latestReleaseDate?: string | null
  hasDomesticAbuse?: boolean
  hasStalking?: boolean
  hasChildProtection?: boolean
  hasActiveEvent?: boolean | null
} = {}): DeliusInputs {
  return {
    isFemale: false,
    rsrScore: 0,
    ogrsScore: 0,
    hasNoMandate: false,
    previousEnforcementActivity: false,
    latestReleaseDate,
    hasActiveEvent,
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

function oasysInputs(
  options: {
    arp?: number
    csrp?: number
    directSrp?: BasePredictorDto | null
    predictorsOutput?: AllPredictorDto
    everCommittedSexualOffence?: boolean
  } = { arp: 0, csrp: 0 },
): OASysInputs {
  const { arp, csrp, directSrp, predictorsOutput, everCommittedSexualOffence = false } = options
  const output = 'predictorsOutput' in options ? predictorsOutput : predictors({ arp, csrp, directSrp })

  return {
    predictors: predictorScores(output),
    everCommittedSexualOffence,
  }
}

function predictorScores(output?: AllPredictorDto): OGRS4Predictors {
  return {
    completedDate: '2026-01-01',
    status: 'COMPLETE',
    assessmentType: 'LAYER3',
    outputVersion: '2',
    output,
  } as OGRS4Predictors
}

function predictors({
  arp,
  csrp,
  directSrp,
}: {
  arp?: number
  csrp?: number
  directSrp?: BasePredictorDto | null
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
            band: 'LOW',
            staticOrDynamic: 'STATIC',
            algorithmVersion: '2',
          }
        : undefined,
    directContactSexualReoffendingPredictor: directSrp ?? undefined,
  }
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

function ignoredSexualPredictorCases(): Array<[string, BasePredictorDto | null]> {
  return [
    ['direct predictor without a band is ignored', { score: 2.11, band: null as unknown as ScoreLevel }],
    ['direct predictor with NOT_APPLICABLE band is ignored', { score: 2.11, band: 'NOT_APPLICABLE' }],
  ]
}

function directSexualReoffendingCases(): Array<[number, ScoreLevel, Tier, boolean]> {
  return [
    [5.31, 'VERY_HIGH', 'A', false],
    [0.01, 'VERY_HIGH', 'A', false],
    [2.11, 'HIGH', 'B', false],
    [1.5, 'HIGH', 'B', false],
    [5.31, 'HIGH', 'B', false],
    [1.12, 'MEDIUM', 'C', false],
    [3.36, 'MEDIUM', 'C', true],
    [2.11, 'MEDIUM', 'D', true],
    [0.6, 'MEDIUM', 'D', false],
    [0.02, 'LOW', 'E', false],
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
    [true, lastYear, 'D'],
    [true, null, 'G'],
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

function sexualOffenceCases(): Array<[boolean, Tier]> {
  return [
    [false, 'G'],
    [true, 'E'],
  ]
}
