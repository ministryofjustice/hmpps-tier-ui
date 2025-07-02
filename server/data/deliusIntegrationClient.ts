import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import logger from '../../logger'

export default class DeliusIntegrationClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('DeliusIntegration', config.apis.deliusIntegration, logger, authenticationClient)
  }

  async getLimitedAccessDetails(username: string, crn: string): Promise<CaseAccess> {
    return this.get({ path: `/users/${username}/access/${crn}` }, asSystem())
  }

  async getTierDetails(crn: string): Promise<DeliusTierInputs> {
    return this.get({ path: `/tier-details/${crn}` }, asSystem())
  }

  async getPersonalDetails(crn: string): Promise<PersonalDetails> {
    return this.get({ path: `/person/${crn}` }, asSystem())
  }
}

interface CaseAccess {
  crn: string
  userExcluded: string
  userRestricted: string
}

export interface PersonalDetails {
  crn: string
  name: {
    forenames: string
    surname: string
  }
}

export interface DeliusTierInputs {
  gender: string
  registrations: DeliusRegistration[]
  convictions: DeliusConviction[]
  rsrscore?: number
  ogrsscore?: number
  previousEnforcementActivity: boolean
}

export interface DeliusRegistration {
  code: string
  description: string
  level?: string
  date: string
}

export interface DeliusConviction {
  terminationDate?: string
  sentenceTypeCode: string
  requirements: DeliusRequirement[]
}

export interface DeliusRequirement {
  mainCategoryTypeCode: string
  restrictive: boolean
}
