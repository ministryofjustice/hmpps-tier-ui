/* eslint-disable no-param-reassign */
import path from 'path'
import nunjucks from 'nunjucks'
import express from 'express'
import fs from 'fs'
import { format, formatDistance, parseISO } from 'date-fns'
import { initialiseName } from './utils'
import config from '../config'
import logger from '../../logger'

export default function nunjucksSetup(app: express.Express): void {
  app.set('view engine', 'njk')

  app.locals.asset_path = '/assets/'
  app.locals.applicationName = 'Tier'
  app.locals.environmentName = config.env
  app.locals.environmentNameColour = config.env === 'preprod' ? 'govuk-tag--green' : ''
  let assetManifest: Record<string, string> = {}

  try {
    const assetMetadataPath = path.resolve(__dirname, '../../assets/manifest.json')
    assetManifest = JSON.parse(fs.readFileSync(assetMetadataPath, 'utf8'))
  } catch (e) {
    if (process.env.NODE_ENV !== 'test') {
      logger.error(e, 'Could not read asset manifest file')
    }
  }

  const njkEnv = nunjucks.configure(
    [
      path.join(__dirname, '../../server/views'),
      'node_modules/govuk-frontend/dist/',
      'node_modules/govuk-frontend/dist/components/',
      'node_modules/@ministryofjustice/frontend/',
      'node_modules/@ministryofjustice/frontend/moj/components/',
      'node_modules/@ministryofjustice/probation-search-frontend/components',
      'node_modules/@ministryofjustice/hmpps-probation-frontend-components/dist/assets/',
    ],
    {
      autoescape: true,
      express: app,
      noCache: process.env.NODE_ENV !== 'production',
    },
  )

  njkEnv.addFilter('initialiseName', initialiseName)
  njkEnv.addFilter('formatNumber', (num: number) => num.toLocaleString('en-GB'))
  njkEnv.addFilter('formatDate', (date?: string, formatStr?: string) =>
    date ? format(parseISO(date), formatStr ?? "d MMMM yyyy' at 'h:mm a") : null,
  )
  njkEnv.addFilter('ago', (date: string) => formatDistance(parseISO(date), new Date(), { addSuffix: true }))
  njkEnv.addFilter('assetMap', (url: string) => assetManifest[url] || url)
}
