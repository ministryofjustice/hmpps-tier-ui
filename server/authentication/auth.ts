import passport, { Strategy } from 'passport'
import { Strategy as OAuth2Strategy } from 'passport-oauth2'
import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import config from '../config'
import generateOauthClientToken from './clientCredentials'
import type { TokenVerifier } from '../data/tokenVerification'

passport.serializeUser((user, done) => {
  // Not used but required for Passport
  done(null, user)
})

passport.deserializeUser((user, done) => {
  // Not used but required for Passport
  done(null, user as Express.User)
})

export type AuthenticationMiddleware = (tokenVerifier: TokenVerifier) => RequestHandler

const authenticationMiddleware: AuthenticationMiddleware = verifyToken => {
  return async (req, res, next) => {
    if (req.isAuthenticated() && (await verifyToken(req))) {
      return next()
    }
    req.session.returnTo = req.originalUrl
    return res.redirect('/sign-in')
  }
}

function init(): void {
  const oauth2Strategy = new OAuth2Strategy(
    {
      authorizationURL: `${config.apis.hmppsAuth.externalUrl}/oauth/authorize`,
      tokenURL: `${config.apis.hmppsAuth.url}/oauth/token`,
      clientID: config.apis.hmppsAuth.apiClientId,
      clientSecret: config.apis.hmppsAuth.apiClientSecret,
      callbackURL: `${config.domain}/sign-in/callback`,
      state: true,
      customHeaders: { Authorization: generateOauthClientToken() },
    },
    (token, refreshToken, params, profile, done) => {
      return done(null, { token, username: params.user_name, authSource: params.auth_source })
    },
  )
  passport.use('oauth2', oauth2Strategy)

  const localStrategy = new (class extends Strategy {
    authenticate() {
      const payload = {
        auth_source: 'delius',
        authorities: ['ROLE_USER'], // Update this to set roles during local dev/testing
        client_id: 'clientid',
        jti: '00000000-0000-0000-0000-000000000000',
        scope: ['read'],
        user_name: 'AUTH_USER',
      }
      const token = jwt.sign(payload, 'secret', { expiresIn: '24h' })
      this.success({ token, username: 'AUTH_USER', authSource: 'delius', displayName: 'Test User' })
    }
  })()
  passport.use('local', localStrategy)
}

export default {
  authenticationMiddleware,
  init,
}
