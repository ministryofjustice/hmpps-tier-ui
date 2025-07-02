import { Router } from 'express'
import { auditService } from '@ministryofjustice/hmpps-audit-client'
import { v4 } from 'uuid'
import type { Services } from '../services'
import DeliusIntegrationClient, { DeliusTierInputs } from '../data/deliusIntegrationClient'
import ArnsApiClient, { OASysTierInputs } from '../data/arnsApiClient'
import TierApiClient, { TierLevel } from '../data/tierApiClient'
import { needsRow, row, Table } from '../utils/table'
import { Abbreviations, ComplexityFactors, mappaDescription } from '../utils/mappings'
import config from '../config'

export default function caseRoutes(router: Router, { hmppsAuthClient }: Services) {
  router.get('/case/:crn', async (req, res, _next) => {
    const { crn } = req.params
    const deliusClient = new DeliusIntegrationClient(hmppsAuthClient)
    const limitedAccess = await deliusClient.getLimitedAccessDetails(res.locals.user.username, crn)
    if (limitedAccess.userRestricted || limitedAccess.userExcluded) {
      res.render('autherror-lao')
      return
    }

    const tierClient = new TierApiClient(hmppsAuthClient)
    const arnsClient = new ArnsApiClient(hmppsAuthClient)

    if (config.audit.enabled) {
      await auditService.sendAuditMessage({
        action: 'VIEW_TIER_INFORMATION',
        who: res.locals.user.username,
        subjectId: crn,
        subjectType: 'CRN',
        correlationId: v4(),
        service: 'hmpps-tier-ui',
      })
    }

    const [personalDetails, deliusInputs, oasysInputs, tierCalculation, history] = await Promise.all([
      deliusClient.getPersonalDetails(crn),
      deliusClient.getTierDetails(crn),
      arnsClient.getTierAssessmentInfo(crn),
      tierClient.getCalculationDetails(crn),
      tierClient.getHistory(crn),
    ])

    const warnings: string[] = []
    const protectTable = calculateProtectLevel(deliusInputs, oasysInputs, tierCalculation.data.protect, warnings)
    const changeTable = calculateChangeLevel(deliusInputs, oasysInputs, tierCalculation.data.change, warnings)

    res.render('pages/case', {
      personalDetails,
      deliusInputs,
      oasysInputs,
      tierCalculation,
      protectTable,
      changeTable,
      history: history.filter(
        (item, index) => index === history.length - 1 || item.tierScore !== history[index + 1].tierScore,
      ),
      warnings: warnings.map(warning => ({ text: warning })),
    })
  })
}

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
      table.push(row(Abbreviations.ROSH, description, `<s>+${points.ROSH}</s><br/><small>(superseded by RSR)</small>`))
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
    needsRow(oasysInputs, 'accommodation', table),
    needsRow(oasysInputs, 'educationTrainingEmployability', table),
    needsRow(oasysInputs, 'relationships', table),
    needsRow(oasysInputs, 'lifestyleAndAssociates', table),
    needsRow(oasysInputs, 'drugMisuse', table),
    needsRow(oasysInputs, 'alcoholMisuse', table),
    needsRow(oasysInputs, 'thinkingAndBehaviour', table),
    needsRow(oasysInputs, 'attitudes', table),
  ].reduce((a, b) => a + b, 0)
}
