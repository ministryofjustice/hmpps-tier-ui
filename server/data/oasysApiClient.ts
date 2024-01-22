import config from '../config'
import RestClient from './restClient'

export default class OasysApiClient extends RestClient {
  constructor(token: string) {
    super('OASys ORDS API', config.apis.oasysApi, token)
  }

  async getAssessments(crn: string): Promise<AssessmentTimeline> {
    return this.get({ path: `/ass/allasslist/prob/${crn}/ALLOW`, handle404: true })
  }

  async getSection6Answers(assessmentId: number): Promise<Section6Answers> {
    return this.get({ path: `/ass/section6/ALLOW/${assessmentId}` })
  }

  async getSection11Answers(assessmentId: number): Promise<Section11Answers> {
    return this.get({ path: `/ass/section11/ALLOW/${assessmentId}` })
  }
}

type YesNo = 'Yes' | 'No'
type Answer = '0-No problems' | '1-Some problems' | '2-Significant problems'

export interface AssessmentTimeline {
  timeline: {
    assessmentPk: number
    assessmentType: string
    status: string
    completedDate?: Date
  }[]
}

export interface Section6Answers {
  assessments: {
    relParentalResponsibilities: YesNo // Question 6.9
  }[]
}

export interface Section11Answers {
  assessments: {
    impulsivity: Answer // Question 11.2
    temperControl: Answer // Question 11.4
  }[]
}
