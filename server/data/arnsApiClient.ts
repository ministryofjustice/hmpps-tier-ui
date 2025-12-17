import { asSystem, asUser, RestClient } from '@ministryofjustice/hmpps-rest-client'
import { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import { parseISO } from 'date-fns'
import config from '../config'
import logger from '../../logger'
import { ignore404 } from '../utils/utils'

export default class ArnsApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Assess Risks and Needs API', config.apis.arnsApi, logger, authenticationClient)
  }

  async getTierAssessmentInfo(crn: string): Promise<OASysTierInputs | null> {
    return this.get({ path: `/tier-assessment/sections/${crn}`, errorHandler: ignore404 }, asSystem())
  }

  async getOverallRiskOfSeriousHarm(crn: string, token: string): Promise<RiskLevel | null> {
    return (
      await this.get<RiskOfSeriousHarmSummary>(
        { path: `/risks/crn/${crn}/summary`, errorHandler: ignore404 },
        asUser(token),
      )
    )?.overallRiskLevel
  }

  async getCombinedSeriousReoffendingPredictor(crn: string, token: string): Promise<BandedScore | null> {
    const rsr = (
      await this.get<PredictorScores[]>(
        { path: `/risks/predictors/rsr/CRN/${crn}`, errorHandler: ignore404 },
        asUser(token),
      )
    )
      .sort((a, b) => parseISO(b.completedDate).getTime() - parseISO(a.completedDate).getTime())
      .find(() => true)
    if (!rsr) return null
    return rsr.outputVersion === '1'
      ? {
          score: rsr.output.rsrPercentageScore,
          band: rsr.output.rsrScoreLevel,
        }
      : rsr.output.combinedSeriousReoffendingPredictor
  }
}

export interface OASysTierInputs extends OASysSections {
  assessment: {
    assessmentId: number
    completedDate: Date
  }
}

export interface OASysSections {
  accommodation?: Section
  educationTrainingEmployability?: Section
  relationships?: RelationshipsSection
  lifestyleAndAssociates?: Section
  drugMisuse?: Section
  alcoholMisuse?: Section
  thinkingAndBehaviour?: ThinkingAndBehaviourSection
  attitudes?: Section
}

export interface Section {
  severity: Severity
}

export interface RelationshipsSection extends Section {
  severity: Severity
  parentalResponsibilities?: YesNo
}

export interface ThinkingAndBehaviourSection extends Section {
  severity: Severity
  impulsivity: Answer
  temperControl: Answer
}

export interface RiskOfSeriousHarmSummary {
  overallRiskLevel: RiskLevel
}

export interface PredictorScoresV1 {
  completedDate?: string
  outputVersion: '1'
  output: {
    rsrPercentageScore: number
    rsrScoreLevel: RiskLevel
  }
}

export interface PredictorScoresV2 {
  completedDate?: string
  outputVersion: '2'
  output: {
    combinedSeriousReoffendingPredictor: BandedScore
  }
}

export type PredictorScores = PredictorScoresV1 | PredictorScoresV2

export interface BandedScore {
  score: number
  band: RiskLevel
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | 'NOT_APPLICABLE'
export type Severity = 'NO_NEED' | 'STANDARD' | 'SEVERE'
type YesNo = 'Yes' | 'No'
type Answer = 'No problems' | 'Some' | 'Significant'
