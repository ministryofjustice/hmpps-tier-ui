import { type RequestHandler, Router } from 'express'

import probationSearchRoutes from '@ministryofjustice/probation-search-frontend/routes/search'
import asyncMiddleware from '../middleware/asyncMiddleware'
import type { Services } from '../services'
import config from '../config'
import DeliusIntegrationClient, { DeliusTierInputs } from '../data/deliusIntegrationClient'
import ArnsApiClient, { OASysTierInputs } from '../data/arnsApiClient'
import TierApiClient, { TierCount, TierLevel } from '../data/tierApiClient'
import { needsRow, row, Table } from '../utils/table'
import { Abbreviations, ComplexityFactors, mappaDescription } from '../utils/mappings'

export default function routes({ hmppsAuthClient }: Services): Router {
  const router = Router()
  const get = (path: string | string[], handler: RequestHandler) => router.get(path, asyncMiddleware(handler))

  probationSearchRoutes({ router, oauthClient: hmppsAuthClient, environment: config.env })

  get('/', async (_req, res, _next) => {
    const counts = await hmppsAuthClient.getSystemClientToken(res.locals.user.username).then(async token => {
      const tierClient = new TierApiClient(token)
      return tierClient.getTierCounts()
    })

    const tierCounts = new TierCountDetail(counts)

    res.render('pages/index', { tierCounts })
  })

  get('/case/:crn', async (req, res, _next) => {
    const { crn } = req.params
    const token = await hmppsAuthClient.getSystemClientToken(res.locals.user.username)
    const deliusClient = new DeliusIntegrationClient(token)
    const tierClient = new TierApiClient(token)
    const arnsClient = new ArnsApiClient(token)
    const [personalDetails, deliusInputs, oasysInputs, tierCalculation] = await Promise.all([
      deliusClient.getPersonalDetails(crn),
      deliusClient.getTierDetails(crn),
      arnsClient.getTierAssessmentInfo(crn),
      tierClient.getCalculationDetails(crn),
    ])

    const warnings: string[] = []
    const protectTable = calculateProtectLevel(deliusInputs, oasysInputs, tierCalculation.data.protect, warnings)
    const changeTable = calculateChangeLevel(deliusInputs, oasysInputs, tierCalculation.data.change, warnings)

    res.render('pages/case', {
      personalDetails,
      deliusInputs,
      tierCalculation,
      protectTable,
      changeTable,
      warnings: warnings.map(warning => ({ text: warning })),
    })
  })

  function calculateProtectLevel(
    deliusInputs: DeliusTierInputs,
    oasysInputs: OASysTierInputs | null,
    tierLevel: TierLevel,
    warnings: string[],
  ) {
    let totalScore = 0
    const table = []
    const points = tierLevel.pointsBreakdown
    const registrations = deliusInputs.registrations.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))

    if (points.ROSH) {
      const rosh = registrations.filter(r => ['RVHR', 'RHRH', 'RMRH'].includes(r.code))
      const description = rosh.find(() => true)?.description ?? 'Not found'
      if (points.ROSH >= points.RSR) {
        totalScore += +points.ROSH
        table.push(row(Abbreviations.ROSH, description, `+${points.ROSH}`))
      } else {
        table.push(
          row(Abbreviations.ROSH, description, `<s>+${points.ROSH}</s><br/><small>(superseded by RSR)</small>`),
        )
      }
      if (rosh.length > 1) warnings.push('Multiple RoSH registrations were found in Delius.')
      if (rosh.length === 0) warnings.push('No RoSH registrations were found in Delius.')
    }

    if (points.RSR) {
      const score = `${deliusInputs.rsrscore}%`
      if (points.RSR > points.ROSH) {
        totalScore += +points.RSR
        table.push(row(Abbreviations.RSR, score, `+${points.RSR}`))
      } else {
        table.push(row(Abbreviations.RSR, score, `<s>+${points.RSR}</s><br/><small>(superseded by RoSH)</small>`))
      }
    }

    if (points.MAPPA > 0) {
      totalScore += +points.MAPPA
      const mappa = registrations.find(r => r.code === 'MAPP' && ['M1', 'M2', 'M3'].includes(r.level))
      const description = mappaDescription(mappa?.level) ?? 'Not found'
      if (!mappa) warnings.push('No MAPPA registration was found in Delius.')
      table.push(row(Abbreviations.MAPPA, description, `+${points.MAPPA}`))
    }

    if (points.COMPLEXITY > 0) {
      table.push(row('Additional complexity factors'))
      const factors = registrations.filter(r => r.code in ComplexityFactors)
      if (factors.length === 0)
        warnings.push(`No additional factors were found in Delius, but the complexity score is ${points.COMPLEXITY}.`)
      if (factors.length * 2 !== points.COMPLEXITY)
        warnings.push(`Additional complexity factors do not match the calculated score of ${points.COMPLEXITY}.`)
      factors.forEach(r => {
        totalScore += 2
        table.push(row('', ComplexityFactors[r.code as keyof typeof ComplexityFactors], `+2`))
      })
    }

    if (points.ADDITIONAL_FACTORS_FOR_WOMEN > 0) {
      if (deliusInputs.gender.toLowerCase() !== 'female') {
        warnings.push(`Additional factors for women were applied, but Delius gender is "${deliusInputs.gender}".`)
      }
      table.push(row('Additional factors for women'))
      if (deliusInputs.previousEnforcementActivity) {
        totalScore += 2
        table.push(row('', 'Breach or recall', `+2`))
      }
      if (oasysInputs?.relationships?.parentalResponsibilities === 'Yes') {
        totalScore += 2
        table.push(row('', 'Parenting responsibilities', `+2`))
      }
      if (
        ['Some', 'Significant'].includes(oasysInputs?.thinkingAndBehaviour?.impulsivity) ||
        ['Some', 'Significant'].includes(oasysInputs?.thinkingAndBehaviour?.temperControl)
      ) {
        totalScore += 2
        table.push(row('', 'Impulsivity and temper control', `+2`))
      }
    }

    table.push(row('Total', undefined, `<strong>${tierLevel.points}</strong>`))

    if (totalScore !== tierLevel.points)
      warnings.push(`Protect points mismatch. \
      The tier has been calculated based on ${tierLevel.points} protect points, but the actual total is ${totalScore}.`)

    return table
  }

  function calculateChangeLevel(
    deliusInputs: DeliusTierInputs,
    oasysInputs: OASysTierInputs | null,
    tierLevel: TierLevel,
    warnings: string[],
  ) {
    let totalScore = 0
    const table = []
    const points = tierLevel.pointsBreakdown

    if (typeof points.NO_VALID_ASSESSMENT !== 'undefined' && oasysInputs) {
      warnings.push('Change level has not been calculated, however an assessment was found in OASys.')
    }

    if (typeof points.NO_MANDATE_FOR_CHANGE !== 'undefined' || typeof points.NO_VALID_ASSESSMENT !== 'undefined') {
      return []
    }

    if (!oasysInputs) warnings.push('Change level has been calculated, however no assessment was found in OASys.')

    const registrations = deliusInputs.registrations.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))

    if (points.OGRS > 0) {
      totalScore += points.OGRS
      table.push(row(Abbreviations.OGRS, `${deliusInputs.ogrsscore ?? 0}%`, `+${points.OGRS}`))
    } else if (deliusInputs.ogrsscore) {
      warnings.push(`OGRS score not used in Tier calculation, but Delius OGRS score is '${deliusInputs.ogrsscore}'.`)
    }

    if (points.IOM > 0) {
      totalScore += points.IOM
      const iom = registrations.find(r => r.code === 'IIOM')
      const description = iom ? 'Yes' : 'None'
      if (!iom) warnings.push('No IOM nominal registration found in Delius.')
      table.push(row(Abbreviations.IOM, description, `+${points.IOM}`))
    }

    if (oasysInputs && points.NEEDS > 0) {
      table.push(row('Criminogenic needs'))
      totalScore += calculateNeedScores(oasysInputs, table)
    }

    if (totalScore !== tierLevel.points)
      warnings.push(`Change points mismatch. \
      The tier has been calculated based on ${tierLevel.points} change points, but the actual total is ${totalScore}.`)

    table.push(row('Total', undefined, `<strong>${tierLevel.points}</strong>`))

    return table
  }

  function calculateNeedScores(oasysInputs: OASysTierInputs, table: Table): number {
    return [
      needsRow(oasysInputs, 'attitudes', table),
      needsRow(oasysInputs, 'accommodation', table),
      needsRow(oasysInputs, 'educationTrainingEmployment', table),
      needsRow(oasysInputs, 'relationships', table),
      needsRow(oasysInputs, 'lifestyleAndAssociates', table),
      needsRow(oasysInputs, 'drugMisuse', table),
      needsRow(oasysInputs, 'alcoholMisuse', table),
      needsRow(oasysInputs, 'thinkingAndBehaviour', table),
    ].reduce((a, b) => a + b, 0)
  }

  return router
}

class TierCountDetail {
  tierCounts: TierCount[]

  maxCount: number

  constructor(tierCounts: TierCount[]) {
    this.tierCounts = tierCounts
    this.maxCount = tierCounts.map(count => count.count).reduce((max, current) => Math.max(max, current), 0)
  }

  getTierCount(protect: string, change: number): number {
    return this.tierCounts.find(count => count.protectLevel === protect && count.changeLevel === change)?.count ?? 0
  }

  getHeat(protect: string, change: number): number {
    const percentage = (this.getTierCount(protect, change) / this.maxCount) * 100
    if (Math.ceil(percentage) < 10) {
      return 10
    }
    return Math.ceil(percentage / 10) * 10
  }
}
