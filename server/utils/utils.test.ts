import { auditService } from '@ministryofjustice/hmpps-audit-client'
import config from '../config'
import { audit, convertToTitleCase, initialiseName, joinWithAnd } from './utils'

jest.mock('@ministryofjustice/hmpps-audit-client', () => ({
  auditService: {
    sendAuditMessage: jest.fn(),
  },
}))

jest.mock('../config', () => ({
  __esModule: true,
  default: { audit: { enabled: true } },
}))

const mockSendAuditMessage = jest.mocked(auditService.sendAuditMessage)
const mockConfig = config

describe('convert to title case', () => {
  it.each([
    [null, null, ''],
    ['empty string', '', ''],
    ['Lower case', 'robert', 'Robert'],
    ['Upper case', 'ROBERT', 'Robert'],
    ['Mixed case', 'RoBErT', 'Robert'],
    ['Multiple words', 'RobeRT SMiTH', 'Robert Smith'],
    ['Leading spaces', '  RobeRT', '  Robert'],
    ['Trailing spaces', 'RobeRT  ', 'Robert  '],
    ['Hyphenated', 'Robert-John SmiTH-jONes-WILSON', 'Robert-John Smith-Jones-Wilson'],
  ])('%s convertToTitleCase(%s, %s)', (_: string, a: string, expected: string) => {
    expect(convertToTitleCase(a)).toEqual(expected)
  })
})

describe('initialise name', () => {
  it.each([
    [null, null, null],
    ['Empty string', '', null],
    ['One word', 'robert', 'r. robert'],
    ['Two words', 'Robert James', 'R. James'],
    ['Three words', 'Robert James Smith', 'R. Smith'],
    ['Double barrelled', 'Robert-John Smith-Jones-Wilson', 'R. Smith-Jones-Wilson'],
  ])('%s initialiseName(%s, %s)', (_: string, a: string, expected: string) => {
    expect(initialiseName(a)).toEqual(expected)
  })
})

describe('joinWithAnd', () => {
  it.each([
    ['no values', [], ''],
    ['one value', ['Alpha'], 'Alpha'],
    ['two values', ['Alpha', 'Beta'], 'Alpha and Beta'],
    ['three values', ['Alpha', 'Beta', 'Gamma'], 'Alpha, Beta and Gamma'],
  ])('%s', (_: string, values: string[], expected: string) => {
    expect(joinWithAnd(values)).toEqual(expected)
  })
})

describe('audit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConfig.audit.enabled = true
  })

  it('sends an audit message when auditing is enabled', async () => {
    await audit('VIEW_TIER_INFORMATION', 'X12345', 'TEST_USER')

    expect(mockSendAuditMessage).toHaveBeenCalledTimes(1)
    expect(mockSendAuditMessage).toHaveBeenCalledWith({
      action: 'VIEW_TIER_INFORMATION',
      who: 'TEST_USER',
      subjectId: 'X12345',
      subjectType: 'CRN',
      correlationId: expect.any(String),
      service: 'hmpps-tier-ui',
    })
  })

  it('does not send an audit message when auditing is disabled', async () => {
    mockConfig.audit.enabled = false

    await audit('VIEW_TIER_INFORMATION', 'X12345', 'TEST_USER')

    expect(mockSendAuditMessage).not.toHaveBeenCalled()
  })
})
