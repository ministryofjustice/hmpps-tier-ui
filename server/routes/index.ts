import { Router } from 'express'

import type { Services } from '../services'
import startRoutes from './start'
import searchRoutes from './search'
import caseRoutes from './case'
import tierAddInfoRoutes from './tiering-additional-information'
import caseV3Routes from './case-v3'

export default function routes(services: Services): Router {
  const router = Router()

  startRoutes(router, services)
  searchRoutes(router, services)
  caseRoutes(router, services)
  caseV3Routes(router, services)
  tierAddInfoRoutes(router)

  return router
}
