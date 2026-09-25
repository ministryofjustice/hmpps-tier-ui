import { Router } from 'express'

export default function tierAddInfoRoutes(router: Router) {
  router.get('/tiering-additional-information', (req, res) => {
    res.render('pages/v2/tiering-additional-information')
  })
}
