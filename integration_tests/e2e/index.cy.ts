import Page from '../pages/page'
import IndexPage from '../pages'

context('Start page', () => {
  it('describes the tier calculation without the removed tier distribution', () => {
    cy.visit('/')
    Page.verifyOnPage(IndexPage)
  })

  it('starts a case search', () => {
    cy.visit('/')
    const page = Page.verifyOnPage(IndexPage)
    page.startNow().should('have.attr', 'href', '/search').click()
    cy.location('pathname').should('eq', '/search')
  })
})
