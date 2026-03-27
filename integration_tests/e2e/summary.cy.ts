import Page from '../pages/page'
import CalculationPage from '../pages/calculation'
import HistoryPage from '../pages/history'
import SummaryPage from '../pages/summary'
import { expectNormalisedText } from '../support/utils'

context('Summary page', () => {
  it('displays the summary page', () => {
    cy.visit('/v3/case/A000006')
    const page = Page.verifyOnPage(SummaryPage)

    page.headerCrn().should('have.text', 'A000006')
    page.headerDob().should('have.text', '15 May 1990')
    page.headerTier().should('have.text', 'B')
    page.headerRosh().should('contain.text', 'ROSH').should('contain.text', 'MEDIUM')
    page.headerRsr().should('contain.text', 'RSR').should('contain.text', 'HIGH').should('contain.text', '12.3')
    page.warnings().should('not.exist')

    expectNormalisedText(page.summaryText(), 'Alex Rivera has a tier of B, based on Reoffending.')
    page.summaryLink('Reoffending').should('have.attr', 'href', '/v3/case/A000006/calculation/#reoffending')
    page.summaryRow('Reoffending').should('contain.text', 'B')
    page.summaryRow('Sexual reoffending').should('contain.text', 'E')
    page.summaryRow('Risk of serious harm').should('contain.text', 'D')
    page.summaryRow('Lifer/IPP').should('contain.text', 'Not applicable')
    page.summaryRow('Domestic abuse').should('contain.text', 'E')
    page.summaryRow('Child protection').should('contain.text', 'F')
    page.summaryRow('Highest tier').should('contain.text', 'B')
  })

  it('navigates to the calculation sections from the summary links', () => {
    cy.visit('/v3/case/A000006')
    const page = Page.verifyOnPage(SummaryPage)

    page.summaryLink('Reoffending').click()
    const calculationPage = Page.verifyOnPage(CalculationPage)
    cy.location('pathname').should('eq', '/v3/case/A000006/calculation/')
    cy.location('hash').should('eq', '#reoffending')
    calculationPage.section('reoffending').should('be.visible')

    cy.visit('/v3/case/A000006')
    const summaryPage = Page.verifyOnPage(SummaryPage)
    summaryPage.summaryLink('Risk of serious harm').click()
    const mappaPage = Page.verifyOnPage(CalculationPage)
    cy.location('pathname').should('eq', '/v3/case/A000006/calculation/')
    cy.location('hash').should('eq', '#mappaRosh')
    mappaPage.section('mappaRosh').should('be.visible')
  })

  it('navigates to the calculation and history tabs', () => {
    cy.visit('/v3/case/A000006')
    const page = Page.verifyOnPage(SummaryPage)

    page.subNavigationLink('Calculation').click()
    const calculationPage = Page.verifyOnPage(CalculationPage)
    cy.location('pathname').should('eq', '/v3/case/A000006/calculation')
    calculationPage.reoffendingSummary().should('exist')

    cy.visit('/v3/case/A000006')
    const summaryPage = Page.verifyOnPage(SummaryPage)
    summaryPage.subNavigationLink('History').click()
    const historyPage = Page.verifyOnPage(HistoryPage)
    cy.location('pathname').should('eq', '/v3/case/A000006/history')
    historyPage.historyItems().should('have.length', 3)
  })

  it('handles limited access', () => {
    cy.visit('/v3/case/A000005')
    cy.get('body').should('contain.text', 'You are not authorised to view this case')
  })
})
