import { asSystem, asUser, RestClient } from '@ministryofjustice/hmpps-rest-client'
import { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import { parseISO } from 'date-fns'
import { AllPredictorVersionedDto } from '@ministryofjustice/hmpps-arns-frontend-components-lib/dist/types/dtos/AllPredictorVersionedDto'
import config from '../config'
import logger from '../../logger'
import { ignore404 } from '../utils/utils'
import {
  BandedScore,
  OASysTierInputs,
  OGRS4Predictors,
  PredictorScores,
  RiskOfSeriousHarmSummary,
  ScoreLevel,
} from './models/arns'

export default class ArnsApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Assess Risks and Needs API', config.apis.arnsApi, logger, authenticationClient)
  }

  async getTierAssessmentInfo(crn: string): Promise<OASysTierInputs | null> {
    return this.get({ path: `/tier-assessment/sections/${crn}`, errorHandler: ignore404 }, asSystem())
  }

  async getOverallRiskOfSeriousHarm(crn: string, token: string): Promise<ScoreLevel | null> {
    const summary = await this.get<RiskOfSeriousHarmSummary>(
      { path: `/risks/crn/${crn}/summary`, errorHandler: ignore404 },
      asUser(token),
    )
    return summary?.overallRiskLevel
  }

  async getCombinedSeriousReoffendingPredictor(crn: string, token: string): Promise<BandedScore | null> {
    const timeline = await this.get<PredictorScores[] | null>(
      { path: `/risks/predictors/rsr/CRN/${crn}`, errorHandler: ignore404 },
      asUser(token),
    )
    if (!timeline || timeline.length === 0) return null

    const rsr = timeline
      .sort((a, b) => parseISO(b.completedDate).getTime() - parseISO(a.completedDate).getTime())
      .find(() => true)

    return rsr.outputVersion === '1'
      ? {
          score: rsr.output.rsrPercentageScore,
          band: rsr.output.rsrScoreLevel,
        }
      : rsr.output.combinedSeriousReoffendingPredictor
  }

  async getRiskPredictors(crn: string, token: string): Promise<OGRS4Predictors | null> {
    const timeline = await this.get<AllPredictorVersionedDto[] | null>(
      { path: `/risks/predictors/all/CRN/${crn}`, errorHandler: ignore404 },
      asUser(token),
    )
    if (!timeline || timeline.length === 0) return null
    return timeline
      .filter(assessment => assessment.outputVersion === '2')
      .sort((a, b) => parseISO(b.completedDate).getTime() - parseISO(a.completedDate).getTime())
      .find(() => true) as OGRS4Predictors
  }
}
