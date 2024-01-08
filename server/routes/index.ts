import { type RequestHandler, Router } from 'express'

import probationSearchRoutes from '@ministryofjustice/probation-search-frontend/routes/search'
import { isAfter, startOfDay, subWeeks } from 'date-fns'
import asyncMiddleware from '../middleware/asyncMiddleware'
import type { Services } from '../services'
import config from '../config'
import DeliusIntegrationClient, { DeliusTierInputs } from '../data/deliusIntegrationClient'
import TierApiClient, { TierCount, TierLevel } from '../data/tierApiClient'
import OasysApiClient, { Section11Answers, Section6Answers } from '../data/oasysApiClient'
import ArnsApiClient, { Needs } from '../data/arnsApiClient'

export default function routes({ hmppsAuthClient, oasysAuthClient }: Services): Router {
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
    const [[personalDetails, deliusInputs, tierCalculation, needs], [section6Answers, section11Answers]] =
      await Promise.all([
        hmppsAuthClient.getSystemClientToken(res.locals.user.username).then(async token => {
          const deliusClient = new DeliusIntegrationClient(token)
          const tierClient = new TierApiClient(token)
          const arnsClient = new ArnsApiClient(token)
          return Promise.all([
            deliusClient.getPersonalDetails(crn),
            deliusClient.getTierDetails(crn),
            tierClient.getCalculationDetails(crn),
            arnsClient.getNeeds(crn),
          ])
        }),
        oasysAuthClient.getToken().then(async token => {
          const oasysClient = new OasysApiClient(token)
          const assessmentsResponse = await oasysClient.getAssessments(crn)
          const assessments =
            assessmentsResponse?.timeline?.filter(
              assessment =>
                assessment.assessmentType === 'LAYER3' &&
                (assessment.status === 'COMPLETE' || assessment.status === 'LOCKED_INCOMPLETE') &&
                assessment.completedDate &&
                isWithinLast55Weeks(assessment.completedDate),
            ) ?? []
          if (assessments.length === 0) return [null, null]
          const { assessmentPk } = assessments.reduce((a, b) => (isAfter(a.completedDate, b.completedDate) ? a : b))
          if (!assessmentPk) return [null, null]
          return Promise.all([
            oasysClient.getSection6Answers(assessmentPk),
            oasysClient.getSection11Answers(assessmentPk),
          ])
        }),
      ])

    const warnings: string[] = []
    const protectTable = calculateProtectLevel(
      deliusInputs,
      tierCalculation.data.protect,
      section6Answers,
      section11Answers,
      warnings,
    )
    const changeTable = calculateChangeLevel(
      deliusInputs,
      tierCalculation.data.change,
      needs && isWithinLast55Weeks(needs.assessedOn) ? needs : null,
      warnings,
    )

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
    tierLevel: TierLevel,
    section6Answers: Section6Answers | null,
    section11Answers: Section11Answers | null,
    warnings: string[],
  ) {
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

    if (points.RSR) {
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
      if (deliusInputs.gender.toLowerCase() !== 'female') {
        warnings.push(`Additional factors for women were applied, but Delius gender is "${deliusInputs.gender}"`)
      }
      table.push(row('Additional factors for women'))
      if (deliusInputs.previousEnforcementActivity) table.push(row('', 'Breach or recall', `+2`))
      if (hasParentingResponsibilities(section6Answers)) table.push(row('', 'Parenting responsibilities', `+2`))
      if (hasImpulsivityOrTemperControl(section11Answers)) table.push(row('', 'Impulsivity and temper control', `+2`))
    }

    table.push(row('Total', undefined, `<strong>${tierLevel.points}</strong>`))

    return table
  }

  function calculateChangeLevel(
    deliusInputs: DeliusTierInputs,
    tierLevel: TierLevel,
    needs: Needs | null,
    warnings: string[],
  ) {
    const table = []
    const points = tierLevel.pointsBreakdown

    if (typeof points.NO_VALID_ASSESSMENT !== 'undefined' && needs) {
      warnings.push('Change level has not been calculated, however an assessment was found in OASys')
    }

    if (typeof points.NO_MANDATE_FOR_CHANGE !== 'undefined' || typeof points.NO_VALID_ASSESSMENT !== 'undefined') {
      return []
    }

    if (!needs) warnings.push('Change level has been calculated, however no assessment was found in OASys')

    const registrations = deliusInputs.registrations.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))

    if (points.OGRS > 0) {
      table.push(row(Abbreviations.OGRS, `${deliusInputs.ogrsscore ?? 0}%`, `+${points.OGRS}`))
    } else if (deliusInputs.ogrsscore) {
      warnings.push(`OGRS score not used in Tier calculation, but Delius OGRS score is '${deliusInputs.ogrsscore}'`)
    }

    if (points.IOM > 0) {
      const iom = registrations.find(r => r.code === 'IIOM')
      const description = iom ? 'Yes' : 'None'
      if (!iom) warnings.push('No IOM nominal registration found in Delius')
      table.push(row(Abbreviations.IOM, description, `+${points.IOM}`))
    }

    if (points.NEEDS > 0) {
      table.push(row('Criminogenic needs'))
      calculateNeedScores(needs, table, points.NEEDS, warnings)
    }

    table.push(row('Total', undefined, `<strong>${tierLevel.points}</strong>`))

    return table
  }

  function calculateNeedScores(needs: Needs, table: Table, expectedScore: number, warnings: string[]) {
    const severeNeedTag = '<span class="govuk-tag govuk-tag--red" title="Severe need">SEVERE</span>'
    let totalScore = 0
    needs?.identifiedNeeds
      ?.filter(need => need.severity !== 'NO_NEED')
      ?.forEach(need => {
        const isSevere = need.severity === 'SEVERE'
        const label = `${need.name} ${isSevere ? severeNeedTag : ''}`
        const score = NeedsWeighting[need.section] * (isSevere ? 2 : 1)
        totalScore += score
        table.push(row('', label, `+${score}`))
      })
    if (totalScore !== expectedScore)
      warnings.push(`Criminogenic needs score mismatch. \
      The tier has been calculated based on a needs score of ${expectedScore}, but the score is ${totalScore}.`)
  }

  /**
   * Infer description from level code (e.g. 'M1' -> 'Level 1')
   * @param levelCode
   */
  function mappaDescription(levelCode?: string): string {
    if (!levelCode) return 'Not found'
    return levelCode.replace('M', 'Level ')
  }

  function hasParentingResponsibilities(answers: Section6Answers): boolean {
    return answers.assessments[0]?.relParentalResponsibilities === 'Yes'
  }

  function hasImpulsivityOrTemperControl(answers: Section11Answers): boolean {
    return (
      answers.assessments[0]?.impulsivity !== '0-No problems' ||
      answers.assessments[0]?.temperControl !== '0-No problems'
    )
  }

  function isWithinLast55Weeks(date: Date) {
    return isAfter(date, subWeeks(startOfDay(new Date()), 55))
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
    if (value) items.push({ html: value })
    if (points) items.push({ html: points, format: 'numeric' })
    return items
  }

  return router
}

type Table = { text?: string; html?: string; colspan?: number; format?: string }[][]

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

const NeedsWeighting = {
  ACCOMMODATION: 1,
  EDUCATION_TRAINING_AND_EMPLOYABILITY: 1,
  RELATIONSHIPS: 1,
  LIFESTYLE_AND_ASSOCIATES: 1,
  DRUG_MISUSE: 1,
  ALCOHOL_MISUSE: 1,
  THINKING_AND_BEHAVIOUR: 2,
  ATTITUDES: 2,
  FINANCIAL_MANAGEMENT_AND_INCOME: 0,
  EMOTIONAL_WELL_BEING: 0,
}

class TierCountDetail {
  tierCounts: TierCount[]

  totalCases: number

  constructor(tierCounts: TierCount[]) {
    this.tierCounts = tierCounts
    this.totalCases = tierCounts.map(count => count.count).reduce((sum, current) => sum + current, 0)
  }

  getTierCount(protect: string, change: number): number {
    return this.tierCounts.find(count => count.protectLevel === protect && count.changeLevel === change).count
  }

  getHeat(protect: string, change: number): number {
    const percentage = (this.getTierCount(protect, change) / this.totalCases) * 100
    if (Math.ceil(percentage) < 10) {
      return 10
    }
    return Math.ceil(percentage / 10) * 10
  }
}
