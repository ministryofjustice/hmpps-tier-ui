import Page from '../pages/page'
import IndexPage from '../pages'

context('Tier Grid populated', () => {
  it('initial page tier grid', () => {
    cy.visit('/')
    const page = Page.verifyOnPage(IndexPage)
    // D
    cy.get(page.heatMapCell(1, 2)).should('contain.text', '218')
    cy.get(page.heatMapCell(2, 2)).should('contain.text', '13038')
    cy.get(page.heatMapCell(3, 2)).should('contain.text', '10793')
    cy.get(page.heatMapCell(4, 2)).should('contain.text', '84663')

    // C
    cy.get(page.heatMapCell(1, 3)).should('contain.text', '4079')
    cy.get(page.heatMapCell(2, 3)).should('contain.text', '52016')
    cy.get(page.heatMapCell(3, 3)).should('contain.text', '32420')
    cy.get(page.heatMapCell(4, 3)).should('contain.text', '22295')

    // B
    cy.get(page.heatMapCell(1, 4)).should('contain.text', '8176')
    cy.get(page.heatMapCell(2, 4)).should('contain.text', '39095')
    cy.get(page.heatMapCell(3, 4)).should('contain.text', '9194')
    cy.get(page.heatMapCell(4, 4)).should('contain.text', '3168')

    // A
    cy.get(page.heatMapCell(1, 5)).should('contain.text', '1323')
    cy.get(page.heatMapCell(2, 5)).should('contain.text', '2841')
    cy.get(page.heatMapCell(3, 5)).should('contain.text', '403')
    cy.get(page.heatMapCell(4, 5)).should('contain.text', '178')
  })
})
