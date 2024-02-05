import Page from '../pages/page'
import IndexPage from '../pages'

context('Tier Grid populated', () => {
  it('initial page tier grid', () => {
    cy.visit('/')
    const page = Page.verifyOnPage(IndexPage)
    // D
    cy.get(page.heatMapCell(1, 2)).should('contain.text', '218')
    cy.get(page.heatMapCell(2, 2)).should('contain.text', '13,038')
    cy.get(page.heatMapCell(3, 2)).should('contain.text', '10,793')
    cy.get(page.heatMapCell(4, 2)).should('contain.text', '84,663')

    // C
    cy.get(page.heatMapCell(1, 3)).should('contain.text', '4,079')
    cy.get(page.heatMapCell(2, 3)).should('contain.text', '52,016')
    cy.get(page.heatMapCell(3, 3)).should('contain.text', '32,420')
    cy.get(page.heatMapCell(4, 3)).should('contain.text', '22,295')

    // B
    cy.get(page.heatMapCell(1, 4)).should('contain.text', '8,176')
    cy.get(page.heatMapCell(2, 4)).should('contain.text', '39,095')
    cy.get(page.heatMapCell(3, 4)).should('contain.text', '9,194')
    cy.get(page.heatMapCell(4, 4)).should('contain.text', '3,168')

    // A
    cy.get(page.heatMapCell(1, 5)).should('contain.text', '1,323')
    cy.get(page.heatMapCell(2, 5)).should('contain.text', '2,841')
    cy.get(page.heatMapCell(3, 5)).should('contain.text', '403')
    cy.get(page.heatMapCell(4, 5)).should('contain.text', '178')
  })
})
