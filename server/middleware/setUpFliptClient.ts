import { Router } from 'express'
import { FliptClient } from '@flipt-io/flipt-client-js'
import config from '../config'

export default async function setUpFliptClient(): Promise<Router> {
  const router = Router()
  const fliptClient = await FliptClient.init({
    url: config.featureFlags.url,
    namespace: 'probation-integration',
  })
  router.use((_, res, next) => {
    res.locals.fliptClient = fliptClient
    next()
  })
  return router
}
