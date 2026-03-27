import CalculationPage from '../pages/calculation'
import HistoryPage from '../pages/history'
import Page from '../pages/page'
import SummaryPage from '../pages/summary'
import { expectNormalisedText } from '../support/utils'

context('Calculation page', () => {
  it('displays the calculation page', () => {
    cy.visit('/v3/case/A000006/calculation')
    const page = Page.verifyOnPage(CalculationPage)

    page.headerTier().should('have.text', 'B')
    page.warnings().should('not.exist')

    expectNormalisedText(
      page.reoffendingSummary(),
      'The All Reoffending Predictor (ARP) is 90% and the Combined Serious Reoffending Predictor (CSRP) is 1%, resulting in a tier of B.',
    )
    expectNormalisedText(
      page.sexualReoffendingSummary(),
      'The Direct Contact Sexual Reoffending Predictor (DC-SRP) is the governing predictor for this step, resulting in a tier of E.',
    )
    expectNormalisedText(
      page.mappaRoshSummary(),
      'This person is assessed as medium Risk of Serious Harm (ROSH) and is subject to Multi-Agency Public Protection Arrangements (MAPPA), resulting in a tier of D.',
    )
    expectNormalisedText(
      page.liferIppSummary(),
      'This person is not a lifer and has not been imprisoned for public protection.',
    )

    page.registrationRow('domesticAbuse').should('contain.text', 'Yes').should('contain.text', 'E')
    page.registrationRow('stalking').should('contain.text', 'No').should('contain.text', 'Not applicable')
    page.registrationRow('childProtection').should('contain.text', 'Yes').should('contain.text', 'F')
  })

  it('navigates to the summary and history tabs', () => {
    cy.visit('/v3/case/A000006/calculation')
    const page = Page.verifyOnPage(CalculationPage)

    page.subNavigationLink('Summary').click()
    const summaryPage = Page.verifyOnPage(SummaryPage)
    cy.location('pathname').should('eq', '/v3/case/A000006')
    summaryPage.summaryText().should('exist')

    cy.visit('/v3/case/A000006/calculation')
    const calculationPage = Page.verifyOnPage(CalculationPage)
    calculationPage.subNavigationLink('History').click()
    const historyPage = Page.verifyOnPage(HistoryPage)
    cy.location('pathname').should('eq', '/v3/case/A000006/history')
    historyPage.historyItems().should('have.length', 3)
  })

  it('handles limited access', () => {
    cy.visit('/v3/case/A000005/history')
    cy.get('body').should('contain.text', 'You are not authorised to view this case')
  })
})
