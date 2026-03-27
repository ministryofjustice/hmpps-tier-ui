import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import logger from '../../logger'
import { ignore404 } from '../utils/utils'
import { TierCalculationV2, TierCount } from './models/tier'

export default class TierV2ApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Tier V2 API', config.apis.tierApi, logger, authenticationClient)
  }

  async getCalculationDetails(crn: string): Promise<TierCalculationV2> {
    return this.get({ path: `/v2/crn/${crn}/tier/details` }, asSystem())
  }

  async getHistory(crn: string): Promise<TierCalculationV2[]> {
    return (await this.get({ path: `/v2/crn/${crn}/tier/history`, errorHandler: ignore404 }, asSystem())) ?? []
  }

  async getTierCounts(): Promise<TierCount[]> {
    return this.get({ path: '/v2/tier-counts' }, asSystem())
  }
}
