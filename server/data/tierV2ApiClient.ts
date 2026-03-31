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
    // TODO replace with `/v2/*` once back-end is released to production
    return this.get({ path: `/crn/${crn}/tier/details` }, asSystem())
  }

  async getHistory(crn: string): Promise<TierCalculationV2[]> {
    return (await this.get({ path: `/crn/${crn}/tier/history`, errorHandler: ignore404 }, asSystem())) ?? []
  }

  async getTierCounts(): Promise<TierCount[]> {
    return this.get({ path: '/tier-counts' }, asSystem())
  }
}
