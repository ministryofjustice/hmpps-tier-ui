import config from '../config'
import RestClient from './restClient'

export default class TierApiClient extends RestClient {
  constructor(token: string) {
    super('Tier API', config.apis.tierApi, token)
  }

  async getCalculationDetails(crn: string): Promise<TierCalculation> {
    return this.get({ path: `/crn/${crn}/tier/details` })
  }

  async getHistory(crn: string): Promise<TierCalculation[]> {
    return (await this.get({ path: `/crn/${crn}/tier/history`, handle404: true })) ?? []
  }

  async getTierCounts(): Promise<TierCount[]> {
    return this.get({ path: '/tier-counts' })
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
