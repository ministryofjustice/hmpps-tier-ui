import CalculationPage from '../pages/calculation'
import HistoryPage from '../pages/history'
import Page from '../pages/page'
import SummaryPage from '../pages/summary'
import { expectNormalisedText } from '../support/utils'

context('History page', () => {
  it('displays the history page', () => {
    cy.visit('/v3/case/A000006/history')
    const page = Page.verifyOnPage(HistoryPage)

    page.headerTier().should('have.text', 'B')
    page.warnings().should('not.exist')

    page.historyItems().should('have.length', 3)
    expectNormalisedText(page.historyItem(1), 'B 4 March 2026 at 2:15 PM Tier recalculated after review')
    expectNormalisedText(page.historyItem(2), 'C 20 January 2026 at 10:30 AM MAPPA registration added')
    expectNormalisedText(page.historyItem(3), 'E 1 November 2025 at 8:00 AM Case created')
  })

  it('navigates to the summary and calculation tabs', () => {
    cy.visit('/v3/case/A000006/history')
    const page = Page.verifyOnPage(HistoryPage)

    page.subNavigationLink('Summary').click()
    const summaryPage = Page.verifyOnPage(SummaryPage)
    cy.location('pathname').should('eq', '/v3/case/A000006')
    summaryPage.summaryText().should('exist')

    cy.visit('/v3/case/A000006/history')
    const historyPage = Page.verifyOnPage(HistoryPage)
    historyPage.subNavigationLink('Calculation').click()
    const calculationPage = Page.verifyOnPage(CalculationPage)
    cy.location('pathname').should('eq', '/v3/case/A000006/calculation')
    calculationPage.reoffendingSummary().should('exist')
  })

  it('handles limited access', () => {
    cy.visit('/v3/case/A000005/history')
    cy.get('body').should('contain.text', 'You are not authorised to view this case')
  })
})
