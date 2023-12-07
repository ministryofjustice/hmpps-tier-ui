import { type RequestHandler, Router } from 'express'

import probationSearchRoutes from '@ministryofjustice/probation-search-frontend/routes/search'
import asyncMiddleware from '../middleware/asyncMiddleware'
import type { Services } from '../services'
import config from '../config'
import DeliusIntegrationClient, { DeliusTierInputs } from '../data/deliusIntegrationClient'
import TierApiClient, { TierLevel } from '../data/tierApiClient'

export default function routes({ hmppsAuthClient: oauthClient }: Services): Router {
  const router = Router()
  const get = (path: string | string[], handler: RequestHandler) => router.get(path, asyncMiddleware(handler))

  probationSearchRoutes({ router, oauthClient, environment: config.env })

  get('/', (_req, res, _next) => res.render('pages/index'))

  get('/case/:crn', async (req, res, _next) => {
    const { crn } = req.params
    const token = await oauthClient.getSystemClientToken()
    const deliusClient = new DeliusIntegrationClient(token)
    const tierClient = new TierApiClient(token)
    const [personalDetails, deliusInputs, tierCalculation] = await Promise.all([
      deliusClient.getPersonalDetails(crn),
      deliusClient.getTierDetails(crn),
      tierClient.getCalculationDetails(crn),
    ])

    const warnings: string[] = []
    const protectTable = calculateProtectLevel(deliusInputs, tierCalculation.data.protect, warnings)
    const changeTable = calculateChangeLevel(deliusInputs, tierCalculation.data.change, warnings)

    res.render('pages/case', {
      personalDetails,
      deliusInputs,
      tierCalculation,
      protectTable,
      changeTable,
      warnings: warnings.map(warning => ({ text: warning })),
    })
  })

  function calculateProtectLevel(deliusInputs: DeliusTierInputs, tierLevel: TierLevel, warnings: string[]) {
    const table = []
    const points = tierLevel.pointsBreakdown
    const registrations = deliusInputs.registrations.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))

    if (points.ROSH) {
      const rosh = registrations.filter(r => ['RVHR', 'RHRH', 'RMRH'].includes(r.code))
      const roshPoints =
        points.ROSH >= points.RSR ? `+${points.ROSH}` : `<s>+${points.ROSH}</s><br/><small>(superseded by RSR)</small>`
      const description = rosh.find(() => true)?.description ?? 'Not found'
      if (rosh.length > 1) warnings.push('Multiple RoSH registrations were found in Delius')
      if (rosh.length === 0) warnings.push('No RoSH registrations were found in Delius')
      table.push(row(Abbreviations.ROSH, description, roshPoints))
    }

    if (deliusInputs.rsrscore) {
      const score = `${deliusInputs.rsrscore}%`
      const rsrPoints =
        points.RSR > points.ROSH ? `+${points.RSR}` : `<s>+${points.RSR}</s><br/><small>(superseded by RoSH)</small>`
      table.push(row(Abbreviations.RSR, score, rsrPoints))
    }

    if (points.MAPPA > 0) {
      const mappa = registrations.find(r => r.code === 'MAPP' && ['M1', 'M2', 'M3'].includes(r.level))
      const description = mappaDescription(mappa?.level) ?? 'Not found'
      if (!mappa) warnings.push('No MAPPA registration was found in Delius')
      table.push(row(Abbreviations.MAPPA, description, `+${points.MAPPA}`))
    }

    if (points.COMPLEXITY > 0) {
      table.push(row('Additional complexity factors'))
      const factors = registrations.filter(r => r.code in ComplexityFactors)
      if (factors.length === 0)
        warnings.push(`No additional factors were found in Delius, but complexity score is ${points.COMPLEXITY}`)
      if (factors.length * 2 !== points.COMPLEXITY)
        warnings.push(`Additional complexity factors do not match the calculated score of ${points.COMPLEXITY}`)
      factors.forEach(r => table.push(row('', ComplexityFactors[r.code as keyof typeof ComplexityFactors], `+2`)))
    }

    if (points.ADDITIONAL_FACTORS_FOR_WOMEN > 0) {
      table.push(row('Additional factors for women'))
      if (deliusInputs.previousEnforcementActivity) table.push(row('', 'Breach or recall', `+2`))
      table.push(row('', 'Parenting responsibilities', missingOasysDataTag))
      table.push(row('', 'Impulsivity and temper control', missingOasysDataTag))
    }

    table.push(row('Total', undefined, `<strong>${tierLevel.points}</strong>`))

    return table
  }

  function calculateChangeLevel(deliusInputs: DeliusTierInputs, tierLevel: TierLevel, warnings: string[]) {
    const table = []
    const points = tierLevel.pointsBreakdown
    if (typeof points.NO_MANDATE_FOR_CHANGE !== 'undefined' || typeof points.NO_VALID_ASSESSMENT !== 'undefined')
      return []

    const registrations = deliusInputs.registrations.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))

    if (deliusInputs.ogrsscore) {
      table.push(row(Abbreviations.OGRS, `${deliusInputs.ogrsscore}%`, `+${points.OGRS}`))
    }

    if (points.IOM > 0) {
      const iom = registrations.find(r => r.code === 'IIOM')
      const description = iom ? 'Yes' : 'None'
      if (!iom) warnings.push('No IOM nominal registration found in Delius')
      table.push(row(Abbreviations.IOM, description, `+${points.IOM}`))
    }

    if (points.NEEDS > 0) {
      table.push(row('Criminogenic needs'))
      table.push(row('', 'Accommodation', missingOasysDataTag))
      table.push(row('', 'Education, training and employability', missingOasysDataTag))
      table.push(row('', 'Relationships', missingOasysDataTag))
      table.push(row('', 'Lifestyle and associates', missingOasysDataTag))
      table.push(row('', 'Drug misuse', missingOasysDataTag))
      table.push(row('', 'Alcohol misuse', missingOasysDataTag))
      table.push(row('', 'Thinking and behaviour', missingOasysDataTag))
      table.push(row('', 'Attitudes', missingOasysDataTag))
      table.push(row('', 'Financial management and income', missingOasysDataTag))
      table.push(row('', 'Emotional wellbeing', missingOasysDataTag))
    }

    table.push(row('Total', undefined, `<strong>${tierLevel.points}</strong>`))

    return table
  }

  /**
   * Infer description from level code (e.g. 'M1' -> 'Level 1')
   * @param levelCode
   */
  function mappaDescription(levelCode?: string): string {
    if (!levelCode) return 'Not found'
    return levelCode.replace('M', 'Level ')
  }

  function row(input: string | Abbreviation, value?: string, points?: string) {
    const items = []
    let colspan = 1
    if (!value) colspan = 2
    if (!value && !points) colspan = 3
    if (typeof input === 'string') {
      items.push({ text: input, colspan })
    } else {
      items.push({ html: `<abbr title="${input.text}">${input.abbreviation}</abbr>`, colspan })
    }
    if (value) items.push({ text: value })
    if (points) items.push({ html: points, format: 'numeric' })
    return items
  }

  return router
}

type Abbreviation = {
  abbreviation: string
  text: string
}

const Abbreviations = {
  ROSH: { abbreviation: 'RoSH', text: 'Risk of Serious Harm' },
  RSR: { abbreviation: 'RSR', text: 'Risk of Serious Recidivism' },
  MAPPA: { abbreviation: 'MAPPA', text: 'Multi-Agency Public Protection Arrangements' },
  IOM: { abbreviation: 'IOM', text: 'Integrated Offender Management' },
  OGRS: { abbreviation: 'OGRS', text: 'Offender Group Reconviction Scale' },
}

const ComplexityFactors = {
  RMDO: 'Mental health',
  ALSH: 'Attempted suicide or self-harm',
  RVLN: 'Vulnerability issues',
  RCCO: 'Child concerns',
  RCPR: 'Child protection',
  RCHD: 'Risk to children',
  RPIR: 'Public interest',
  RVAD: 'Adult at risk',
  STRG: 'Street gangs',
  RTAO: 'Terrorism',
}

const missingOasysDataTag =
  '<span class="govuk-tag govuk-tag--red" title="OASys integration coming soon!">Unknown</span>'
