import Page, { PageElement } from './page'

export default class CasePage extends Page {
  constructor() {
    super('Tier - View')
  }

  headerCrn = (): PageElement => cy.get('[data-qa=case-details-header-crn]')

  headerDob = (): PageElement => cy.get('[data-qa=case-details-header-dob]')

  headerTier = (): PageElement => cy.get('[data-qa=case-details-header-tier]')

  headerRosh = (): PageElement => cy.get('[data-qa=case-details-header-rosh]')

  headerRsr = (): PageElement => cy.get('[data-qa=case-details-header-rsr]')

  warnings = (): PageElement => cy.get('.govuk-error-summary')

  protectTable = (): PageElement => cy.get('[data-qa=protect-table]')

  protectTableRow = (row: number): string => `[data-qa=protect-table] tbody tr:nth-child(${row})`

  changeTable = (): PageElement => cy.get('[data-qa=change-table]')

  changeTableRow = (row: number): string => `[data-qa=change-table] tbody tr:nth-child(${row})`

  timelineItem = (row: number): string => `.moj-timeline .moj-timeline__item:nth-child(${row})`
}
