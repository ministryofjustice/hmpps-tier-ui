import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import logger from '../../logger'
import { ignore404 } from '../utils/utils'

export default class TierApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Tier API', config.apis.tierApi, logger, authenticationClient)
  }

  async getCalculationDetails(crn: string): Promise<TierCalculation> {
    return this.get({ path: `/crn/${crn}/tier/details` }, asSystem())
  }

  async getHistory(crn: string): Promise<TierCalculation[]> {
    return (await this.get({ path: `/crn/${crn}/tier/history`, errorHandler: ignore404 }, asSystem())) ?? []
  }

  async getTierCounts(): Promise<TierCount[]> {
    return this.get({ path: '/tier-counts' }, asSystem())
  }
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

export interface TierCalculation {
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
