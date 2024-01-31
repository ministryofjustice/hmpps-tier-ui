import config from '../config'
import RestClient from './restClient'

export default class DeliusIntegrationClient extends RestClient {
  constructor(token: string) {
    super('DeliusIntegration', config.apis.deliusIntegration, token)
  }

  async getLimitedAccessDetails(username: string, crn: string): Promise<CaseAccess> {
    return this.get({ path: `/users/${username}/access/${crn}` })
  }

  async getTierDetails(crn: string): Promise<DeliusTierInputs> {
    return this.get({ path: `/tier-details/${crn}` })
  }

  async getPersonalDetails(crn: string): Promise<PersonalDetails> {
    return this.get({ path: `/person/${crn}` })
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
