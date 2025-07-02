import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import logger from '../../logger'
import { ignore404 } from '../utils/utils'

export default class ArnsApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Assess Risks and Needs API', config.apis.arnsApi, logger, authenticationClient)
  }

  async getTierAssessmentInfo(crn: string): Promise<OASysTierInputs | null> {
    return this.get({ path: `/tier-assessment/sections/${crn}`, errorHandler: ignore404 }, asSystem())
  }
}

export interface OASysTierInputs extends OASysSections {
  assessment: {
    assessmentId: number
    completedDate: Date
  }
}

export interface OASysSections {
  accommodation?: Section
  educationTrainingEmployability?: Section
  relationships?: RelationshipsSection
  lifestyleAndAssociates?: Section
  drugMisuse?: Section
  alcoholMisuse?: Section
  thinkingAndBehaviour?: ThinkingAndBehaviourSection
  attitudes?: Section
}

export interface Section {
  severity: Severity
}

export interface RelationshipsSection extends Section {
  severity: Severity
  parentalResponsibilities?: YesNo
}

export interface ThinkingAndBehaviourSection extends Section {
  severity: Severity
  impulsivity: Answer
  temperControl: Answer
}

export type Severity = 'NO_NEED' | 'STANDARD' | 'SEVERE'
type YesNo = 'Yes' | 'No'
type Answer = 'No problems' | 'Some' | 'Significant'
