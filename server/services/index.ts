import CaseSearchService from '@ministryofjustice/probation-search-frontend/service/caseSearchService'
import { dataAccess } from '../data'
import config from '../config'

export const services = () => {
  const { applicationInfo, hmppsAuthClient } = dataAccess()

  const searchService = new CaseSearchService({
    hmppsAuthClient,
    environment: config.env,
    extraColumns: [
      { header: 'Tier', value: result => (result.currentTier ? result.currentTier.replace(/^U/, '') : '') },
    ],
  })

  return {
    applicationInfo,
    hmppsAuthClient,
    searchService,
  }
}

export type Services = ReturnType<typeof services>
