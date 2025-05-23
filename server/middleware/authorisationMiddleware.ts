import { jwtDecode } from 'jwt-decode'
import type { RequestHandler } from 'express'

import logger from '../../logger'

export default function authorisationMiddleware(allowedRoles: string[] = []): RequestHandler {
  return (req, res, next) => {
    const allowedAuthorities = allowedRoles.map(role => (role.startsWith('ROLE_') ? role : `ROLE_${role}`))
    if (res.locals?.user?.token) {
      const { authorities = [], auth_source: authSource } = jwtDecode(res.locals.user.token) as {
        authorities?: string[]
        auth_source?: string
      }

      if (
        authSource !== 'delius' ||
        (allowedAuthorities.length && !authorities.some(authority => allowedAuthorities.includes(authority)))
      ) {
        logger.error('User is not authorised to access this')
        return res.redirect('/authError')
      }

      return next()
    }

    req.session.returnTo = req.originalUrl
    return res.redirect('/sign-in')
  }
}
