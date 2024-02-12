import { Router } from 'express'
import type { Services } from '../services'
import startRoutes from './start'
import searchRoutes from './search'
import caseRoutes from './case'
import { defaultClient } from 'applicationinsights'

export default function routes(services: Services): Router {
  const router = Router()

  router.use((req, res, next) => {
    if (!res.get('startTime')) {
      res.set('startTime', new Date().toISOString())
    }
    res.on('finish', async () => {
      if (req.route?.path && res.statusCode && res.get('startTime')) {
        defaultClient?.trackRequest({
          name: req.route.path,
          url: req.url,
          duration: new Date().getTime() - new Date(res.get('startTime')).getTime(),
          resultCode: res.statusCode,
          success: res.statusCode >= 200 && res.statusCode < 300,
        })
      }
    })
    next()
  })

  startRoutes(router, services)
  searchRoutes(router, services)
  caseRoutes(router, services)

  return router
}
