import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import logger from '../../logger'
import { CaseAccess, DeliusResponse, PersonalDetails } from './models/delius'

export default class DeliusIntegrationClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('DeliusIntegration', config.apis.deliusIntegration, logger, authenticationClient)
  }

  async getLimitedAccessDetails(username: string, crn: string): Promise<CaseAccess> {
    return this.get({ path: `/users/${username}/access/${crn}` }, asSystem())
  }

  async getTierDetails(crn: string): Promise<DeliusResponse> {
    return this.get({ path: `/tier-details/${crn}` }, asSystem())
  }

  async getPersonalDetails(crn: string): Promise<PersonalDetails> {
    return this.get({ path: `/person/${crn}` }, asSystem())
  }
}
