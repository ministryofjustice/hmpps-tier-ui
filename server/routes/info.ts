import { Router } from 'express'

export default function infoRoutes(router: Router) {
  router.get('pages/info', (req, res) => {
    res.render('pages/info')
  })
}
