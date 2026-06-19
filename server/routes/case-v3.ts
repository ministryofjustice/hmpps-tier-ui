import { Handler, Router } from 'express'
import { ArnsComponents } from '@ministryofjustice/hmpps-arns-frontend-components-lib'
import { asUser } from '@ministryofjustice/hmpps-rest-client'
import { telemetry } from '@ministryofjustice/hmpps-azure-telemetry'
import type { Services } from '../services'
import DeliusIntegrationClient from '../data/deliusIntegrationClient'
import TierV3ApiClient from '../data/tierV3ApiClient'
import { StepTitles } from '../utils/mappings'
import { buildSummaryTable } from '../utils/table'
import { audit, joinWithAnd } from '../utils/utils'
import { calculate, StepResultEntry } from '../utils/calculation'
import ArnsApiClient from '../data/arnsApiClient'
import config from '../config'
import logger from '../../logger'

export default function caseV3Routes(router: Router, { hmppsAuthClient }: Services) {
  function loadCase(page: string): Handler {
    return async (req, res, _next) => {
      const crn = req.params.crn as string
      const deliusClient = new DeliusIntegrationClient(hmppsAuthClient)
      const limitedAccess = await deliusClient.getLimitedAccessDetails(res.locals.user.username, crn)
      if (limitedAccess.userRestricted || limitedAccess.userExcluded) {
        res.render('autherror-lao')
        return
      }
      await audit('VIEW_TIER_INFORMATION', crn, res.locals.user.username)

      const tierClient = new TierV3ApiClient(hmppsAuthClient)
      const arnsClient = new ArnsApiClient(hmppsAuthClient)
      const arnsComponentsClient = new ArnsComponents(hmppsAuthClient, config.apis.arnsApi, logger)
      const [personalDetails, riskData, rosh, rsr, tierCalculation] = await Promise.all([
        deliusClient.getPersonalDetails(crn),
        arnsComponentsClient.getRiskData(asUser(res.locals.user.token), 'crn', crn),
        arnsClient.getOverallRiskOfSeriousHarm(crn, res.locals.user.token),
        arnsClient.getCombinedSeriousReoffendingPredictor(crn, res.locals.user.token),
        tierClient.getCalculationDetails(crn),
      ])

      const warnings: string[] = []
      const { tier: storedTier, provisional, deliusInputs, oasysInputs } = tierCalculation.data
      const { tier: derivedTier, stepResults } = calculate(warnings, deliusInputs, oasysInputs)

      if (derivedTier !== storedTier) {
        warnings.push(
          `Calculation mismatch. The current tier is ${storedTier}, but the factors indicate this person's tier should be ${derivedTier}.`,
        )
        telemetry.trackEvent('CalculationMismatch', {
          crn,
          storedTier,
          derivedTier,
          stepResults: JSON.stringify(stepResults),
        })
      }

      const fullName = `${personalDetails.name.forename} ${personalDetails.name.surname}`
      const tierSummaries: Record<string, () => string> = {
        NOT_SUPERVISED: () =>
          `${fullName} has <strong>no applicable tier</strong>, as the case is not currently supervised.`,
        MISSING: () =>
          `${fullName} has a <strong>missing tier</strong>, as no reoffending risk predictors are available.`,
        DEFAULT: () => {
          const primarySources = Object.entries(stepResults)
            .filter(([_, result]) => result.tier === derivedTier)
            .map(([key, _]: StepResultEntry) => StepTitles[key])
          const provisionalTip =
            '<abbr title="A tier is provisional if it is not based on a dynamic assessment and cannot be inferred from other factors.">provisional</abbr>'
          return `${fullName} has a${provisional ? ` ${provisionalTip}` : ''} tier of <strong>${tierCalculation.tierScore}</strong>, based on ${primarySources.length ? joinWithAnd(primarySources) : 'the recorded calculation'}.`
        },
      }
      const tierSummary = (tierSummaries[derivedTier] ?? tierSummaries.DEFAULT)()
      const summaryTable = buildSummaryTable(crn, oasysInputs?.predictors?.output, stepResults, derivedTier)

      res.render(page, {
        personalDetails,
        rosh,
        rsr,
        tierCalculation,
        provisional,
        deliusInputs,
        oasysInputs,
        riskData,
        stepResults,
        summaryTable,
        tierSummary,
        oasysUrl: config.oasys.url,
        warnings: warnings.map(warning => ({ text: warning })),
      })
    }
  }

  router.all('/v3/*splat', async (_req, res, next) => {
    const result = res.locals.fliptClient.evaluateBoolean({
      flagKey: 'tier-v3-ui',
      entityId: res.locals.user.username,
      context: { username: res.locals.user.username },
    })
    if (!result.enabled) {
      telemetry.trackEvent('UserNotAuthorisedToAccessV3', { username: res.locals.user.username })
      res.redirect('/authError')
    } else next()
  })

  router.get('/v3/case/:crn', loadCase('pages/v3/summary'))

  router.get('/v3/case/:crn/calculation', loadCase('pages/v3/calculation'))

  router.get('/v3/case/:crn/history', async (req, res, _next) => {
    const crn = req.params.crn as string
    const deliusClient = new DeliusIntegrationClient(hmppsAuthClient)
    const limitedAccess = await deliusClient.getLimitedAccessDetails(res.locals.user.username, crn)
    if (limitedAccess.userRestricted || limitedAccess.userExcluded) {
      res.render('autherror-lao')
      return
    }
    await audit('VIEW_TIER_HISTORY', crn, res.locals.user.username)

    const tierClient = new TierV3ApiClient(hmppsAuthClient)
    const arnsClient = new ArnsApiClient(hmppsAuthClient)
    const [personalDetails, rosh, rsr, tierCalculation, history] = await Promise.all([
      deliusClient.getPersonalDetails(crn),
      arnsClient.getOverallRiskOfSeriousHarm(crn, res.locals.user.token),
      arnsClient.getCombinedSeriousReoffendingPredictor(crn, res.locals.user.token),
      tierClient.getCalculationDetails(crn),
      tierClient.getHistory(crn),
    ])

    res.render('pages/v3/history', { personalDetails, rosh, rsr, tierCalculation, history })
  })
}
