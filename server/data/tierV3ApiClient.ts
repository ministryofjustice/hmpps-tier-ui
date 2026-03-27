import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import logger from '../../logger'
import { ignore404 } from '../utils/utils'
import { TierCalculationV3 } from './models/tier'
import cache from '../utils/cache'

export default class TierV3ApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Tier V3 API', config.apis.tierApi, logger, authenticationClient)
  }

  async getCalculationDetails(crn: string): Promise<TierCalculationV3> {
    return this.get({ path: `/v3/crn/${crn}/tier/details` }, asSystem())
  }

  async getHistory(crn: string): Promise<TierCalculationV3[]> {
    const history = await this.get<TierCalculationV3[]>(
      { path: `/v3/crn/${crn}/tier/history`, errorHandler: ignore404 },
      asSystem(),
    )
    return (history ?? []).filter(
      (item, index) => index === history.length - 1 || item.tierScore !== history[index + 1].tierScore,
    )
  }

  async getTierCounts(): Promise<Record<string, number>> {
    return cache('tier-counts', () => this.get<Record<string, number>>({ path: '/v3/tier-counts' }, asSystem()))
  }
}
