import { Router } from 'express'

export default function caseDefaultRoutes(router: Router) {
  router.get('/case/*splat', async (req, res, next) => {
    const result = res.locals.fliptClient.evaluateBoolean({
      flagKey: 'tier-v3-ui',
      entityId: res.locals.user.username,
      context: { username: res.locals.user.username },
    })
    if (!result.enabled) {
      res.redirect(`/v2/case/${req.params.splat}`)
    } else {
      res.redirect(`/v3/case/${req.params.splat}`)
    }
  })
}
