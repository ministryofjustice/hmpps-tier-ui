import config from '../config'
import RestClient from './restClient'

export default class TierApiClient extends RestClient {
  constructor(token: string) {
    super('TierApi', config.apis.tierApi, token)
  }

  async getCalculationDetails(crn: string): Promise<TierCalculation> {
    return this.get({ path: `/crn/${crn}/tier/details` })
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
}

export interface TierLevel {
  tier: string
  points: number
  pointsBreakdown: Record<CalculationRule, number>
}
