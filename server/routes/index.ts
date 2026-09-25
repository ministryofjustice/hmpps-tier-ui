import { Router } from 'express'

import type { Services } from '../services'
import startRoutes from './start'
import searchRoutes from './search'
import tierAddInfoRoutes from './tiering-additional-information'
import caseV2Routes from './case-v2'
import caseV3Routes from './case-v3'
import caseDefaultRoutes from './case'

export default function routes(services: Services): Router {
  const router = Router()

  startRoutes(router, services)
  searchRoutes(router, services)
  caseV2Routes(router, services)
  caseV3Routes(router, services)
  caseDefaultRoutes(router)
  tierAddInfoRoutes(router)

  return router
}
