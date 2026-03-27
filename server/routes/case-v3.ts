import { Handler, Router } from 'express'
import { ArnsComponents } from '@ministryofjustice/hmpps-arns-frontend-components-lib'
import { asUser } from '@ministryofjustice/hmpps-rest-client'
import { defaultClient } from 'applicationinsights'
import type { Services } from '../services'
import DeliusIntegrationClient from '../data/deliusIntegrationClient'
import TierV3ApiClient from '../data/tierV3ApiClient'
import { StepTitles } from '../utils/mappings'
import { buildSummaryTable } from '../utils/table'
import { audit, joinWithAnd } from '../utils/utils'
import {
  calculateLiferAndImprisonmentForPublicProtection,
  calculateMappaAndRiskOfSeriousHarm,
  calculateNonSexualReoffending,
  calculateRegistrationTier,
  calculateSexualReoffending,
  maxTier,
  StepKey,
  StepResult,
  StepResultEntry,
} from '../utils/calculation'
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
      const [personalDetails, riskData, rosh, rsr, tierCalculation, tierCounts] = await Promise.all([
        deliusClient.getPersonalDetails(crn),
        arnsComponentsClient.getRiskData(asUser(res.locals.user.token), 'crn', crn),
        arnsClient.getOverallRiskOfSeriousHarm(crn, res.locals.user.token),
        arnsClient.getCombinedSeriousReoffendingPredictor(crn, res.locals.user.token),
        tierClient.getCalculationDetails(crn),
        tierClient.getTierCounts(),
      ])

      const warnings: string[] = []
      const riskPredictors = tierCalculation.data.riskPredictors?.output
      const { deliusInputs } = tierCalculation.data
      const { hasDomesticAbuse, hasStalking, hasChildProtection } = deliusInputs.registrations
      const stepResults: Record<StepKey, StepResult> = {
        reoffending: calculateNonSexualReoffending(riskPredictors),
        sexualReoffending: calculateSexualReoffending(warnings, riskPredictors),
        mappaRosh: calculateMappaAndRiskOfSeriousHarm(deliusInputs),
        liferIpp: calculateLiferAndImprisonmentForPublicProtection(deliusInputs),
        domesticAbuse: calculateRegistrationTier(hasDomesticAbuse, 'E'),
        stalking: calculateRegistrationTier(hasStalking, 'F'),
        childProtection: calculateRegistrationTier(hasChildProtection, 'F'),
      }

      const dynamicAssessmentUsed =
        riskPredictors?.combinedSeriousReoffendingPredictor?.staticOrDynamic === 'DYNAMIC' &&
        riskPredictors?.allReoffendingPredictor?.staticOrDynamic === 'DYNAMIC'
      const indicative =
        !dynamicAssessmentUsed && stepResults.mappaRosh.tier !== 'A' && stepResults.sexualReoffending.tier !== 'A'

      const derivedTier = maxTier(Object.values(stepResults).map(result => result.tier))
      const summaryTable = buildSummaryTable(crn, stepResults, derivedTier)

      if (derivedTier !== tierCalculation.data.tier) {
        warnings.push(
          `Calculation mismatch. The calculated tier is ${tierCalculation.data.tier}, but the factors indicate this person's tier should be ${derivedTier}.`,
        )
        defaultClient.trackEvent({
          name: 'CalculationMismatch',
          properties: { crn, storedTier: tierCalculation.data.tier, derivedTier },
        })
      }

      const primarySources = Object.entries(stepResults)
        .filter(([_, result]) => result.tier === derivedTier)
        .map(([key, _]: StepResultEntry) => StepTitles[key])
      const primarySourceText = primarySources.length ? joinWithAnd(primarySources) : 'the recorded calculation'

      res.render(page, {
        personalDetails,
        rosh,
        rsr,
        tierCalculation,
        indicative,
        deliusInputs,
        riskPredictors,
        riskData,
        stepResults,
        summaryTable,
        primarySourceText,
        tierCounts,
        oasysUrl: config.oasys.url,
        warnings: warnings.map(warning => ({ text: warning })),
      })
    }
  }

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
