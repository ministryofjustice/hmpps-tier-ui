import Page, { PageElement } from './page'

export default class IndexPage extends Page {
  constructor() {
    super('Check a Tier')
  }

  headerUserName = (): PageElement => cy.get('[data-qa=header-user-name]')

  headerPhaseBanner = (): PageElement => cy.get('[data-qa=header-phase-banner]')

  heatMapCell = (row: number, col: number): string => `tbody tr:nth-child(${row}) td:nth-child(${col})`
}
