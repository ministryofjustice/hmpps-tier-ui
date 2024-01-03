import config from '../config'
import RestClient from './restClient'

export default class ArnsApiClient extends RestClient {
  constructor(token: string) {
    super('Assess Risks and Needs API', config.apis.arnsApi, token)
  }

  async getNeeds(crn: string): Promise<Needs> {
    return this.get({ path: `/needs/crn/${crn}`, handle404: true })
  }
}

type Severity = 'STANDARD' | 'SEVERE'

type Section =
  | 'ACCOMMODATION'
  | 'EDUCATION_TRAINING_AND_EMPLOYABILITY'
  | 'RELATIONSHIPS'
  | 'LIFESTYLE_AND_ASSOCIATES'
  | 'DRUG_MISUSE'
  | 'ALCOHOL_MISUSE'
  | 'THINKING_AND_BEHAVIOUR'
  | 'ATTITUDES'
  | 'FINANCIAL_MANAGEMENT_AND_INCOME'
  | 'EMOTIONAL_WELL_BEING'

export interface Needs {
  assessedOn: Date
  identifiedNeeds: {
    section: Section
    name: string
    severity: Severity
  }[]
}
