import { type RequestHandler, Router } from 'express'

import probationSearchRoutes from '@ministryofjustice/probation-search-frontend/routes/search'
import asyncMiddleware from '../middleware/asyncMiddleware'
import type { Services } from '../services'
import config from '../config'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function routes(service: Services): Router {
  const router = Router()
  const get = (path: string | string[], handler: RequestHandler) => router.get(path, asyncMiddleware(handler))

  get('/', (_req, res, _next) => res.render('pages/index'))
  get('/case/:crn', (_req, res, _next) => res.render('pages/case'))

  probationSearchRoutes({
    router,
    path: '/search',
    template: 'pages/search',
    environment: config.env,
    oauthClient: service.hmppsAuthClient,
  })

  return router
}
