/* eslint-disable no-param-reassign */
import path from 'path'
import nunjucks from 'nunjucks'
import express from 'express'
import { format, formatDistance, parseISO } from 'date-fns'
import { initialiseName } from './utils'
import config from '../config'
import applicationInfo from '../applicationInfo'

export default function nunjucksSetup(app: express.Express): void {
  app.set('view engine', 'njk')

  app.locals.asset_path = '/assets/'
  app.locals.applicationName = 'Tier'
  app.locals.environmentName = config.env
  app.locals.environmentNameColour = config.env === 'preprod' ? 'govuk-tag--green' : ''

  // Cachebusting version string
  if (config.production) {
    // Version only changes with new commits
    app.locals.version = applicationInfo().gitShortHash
  } else {
    // Version changes every request
    app.use((req, res, next) => {
      res.locals.version = Date.now().toString()
      return next()
    })
  }

  const njkEnv = nunjucks.configure(
    [
      path.join(__dirname, '../../server/views'),
      'node_modules/govuk-frontend/dist',
      'node_modules/govuk-frontend/dist/components/',
      'node_modules/@ministryofjustice/frontend/',
      'node_modules/@ministryofjustice/frontend/moj/components/',
      'node_modules/@ministryofjustice/probation-search-frontend/components',
      'node_modules/@ministryofjustice/hmpps-probation-frontend-components/dist/assets/',
    ],
    {
      autoescape: true,
      express: app,
    },
  )

  njkEnv.addFilter('initialiseName', initialiseName)
  njkEnv.addFilter('formatNumber', (num: number) => num.toLocaleString('en-GB'))
  njkEnv.addFilter('formatDate', (date?: string, formatStr?: string) =>
    date ? format(parseISO(date), formatStr ?? "d MMMM yyyy' at 'h:mm a") : null,
  )
  njkEnv.addFilter('ago', (date: string) => formatDistance(parseISO(date), new Date(), { addSuffix: true }))
}
