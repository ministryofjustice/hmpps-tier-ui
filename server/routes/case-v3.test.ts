import express, { Router } from 'express'
import request from 'supertest'
import { telemetry } from '@ministryofjustice/hmpps-azure-telemetry'
import type { Services } from '../services'
import caseV3Routes from './case-v3'

jest.mock('@ministryofjustice/hmpps-azure-telemetry', () => ({
  telemetry: {
    trackEvent: jest.fn(),
  },
}))

const mockTrackEvent = jest.mocked(telemetry.trackEvent)

describe('caseV3Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('tracks the user UUID when access to v3 is denied', async () => {
    const app = express()
    const router = Router()
    const evaluateBoolean = jest.fn().mockReturnValue({ enabled: false })

    caseV3Routes(router, {} as Services)
    app.use((req, res, next) => {
      res.locals.user = {
        authSource: 'delius',
        displayName: 'Test User',
        name: 'Test User',
        token: 'token',
        userId: 'user-id',
        userRoles: [],
        userUuid: 'user-uuid',
        username: 'test-user',
      }
      res.locals.fliptClient = { evaluateBoolean } as never
      next()
    })
    app.use(router)

    await request(app).get('/v3/case/A000001').expect(302).expect('Location', '/authError')

    expect(mockTrackEvent).toHaveBeenCalledWith('UserNotAuthorisedToAccessV3', { userUuid: 'user-uuid' })
  })
})
