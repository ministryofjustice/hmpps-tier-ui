export interface CaseAccess {
  crn: string
  userExcluded: string
  userRestricted: string
}

export interface PersonalDetails {
  crn: string
  name: {
    forename: string
    middleName?: string
    surname: string
  }
  dateOfBirth: string
  age: string
}

export interface DeliusResponse {
  gender: string
  registrations: DeliusRegistration[]
  convictions: DeliusConviction[]
  rsrscore?: number
  ogrsscore?: number
  previousEnforcementActivity: boolean
  latestReleaseDate?: string
}

export interface DeliusRegistration {
  code: string
  description: string
  level?: string
  category?: string
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
