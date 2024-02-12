import { type RequestHandler, Router } from 'express'
import asyncMiddleware from '../middleware/asyncMiddleware'
import type { Services } from '../services'
import TierApiClient, { TierCount } from '../data/tierApiClient'

export default function startRoutes(router: Router, { hmppsAuthClient }: Services) {
  const get = (path: string | string[], handler: RequestHandler) => router.get(path, asyncMiddleware(handler))

  get('/', async (_req, res, _next) => {
    const counts = await hmppsAuthClient.getSystemClientToken(res.locals.user.username).then(async token => {
      const tierClient = new TierApiClient(token)
      return tierClient.getTierCounts()
    })

    const tierCounts = new TierCountDetail(counts)

    res.render('pages/index', { tierCounts })
  })
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
