import { Router } from 'express'

export default function tierAddInfoRoutes(router: Router) {
  router.get('/tiering-additional-information', (req, res) => {
    res.render('/tiering-additional-information')
  })
}
