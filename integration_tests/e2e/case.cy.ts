import CasePage from '../pages/case'
import Page from '../pages/page'

context('Case view screen', () => {
  it('basic case', () => {
    cy.visit('/case/X000001')
    const page = Page.verifyOnPage(CasePage)
    page.headerCrn().should('contain.text', 'X000001')
    page.headerSex().should('contain.text', 'Female')
    page.headerTier().should('contain.text', 'B1')
    page.warnings().should('not.exist')
    cy.get(page.protectTableRow(1))
      .should('contain.text', 'Medium RoSH')
      .should('contain.text', '+10')
      .should('contain.text', '(superseded by RSR)')
    cy.get(page.protectTableRow(2))
      .should('contain.text', 'RSR')
      .should('contain.text', '12.3%')
      .should('contain.text', '+20')
      .should('not.contain.text', 'superseded')
    cy.get(page.protectTableRow(3))
      .should('contain.text', 'MAPPA')
      .should('contain.text', 'Level 1')
      .should('contain.text', '+5')
    cy.get(page.protectTableRow(4)).should('contain.text', 'Additional complexity factors')
    cy.get(page.protectTableRow(5)).should('contain.text', 'Street gangs').should('contain.text', '+2')
    cy.get(page.protectTableRow(6)).should('contain.text', 'Additional factors for women')
    cy.get(page.protectTableRow(7)).should('contain.text', 'Breach or recall').should('contain.text', '+2')
    cy.get(page.protectTableRow(8))
      .should('contain.text', 'Impulsivity and temper control')
      .should('contain.text', '+2')
    cy.get(page.protectTableRow(9)).should('contain.text', 'Total').should('contain.text', '31')
  })

  it('handles multiple rosh registrations', () => {
    cy.visit('/case/X000002')
    const page = Page.verifyOnPage(CasePage)
    page.warnings().should('contain.text', 'Multiple RoSH registrations were found in Delius')
    page.protectTable().should('not.contain.text', 'High RoSH')
    cy.get(page.protectTableRow(1)).should('contain.text', 'Medium RoSH')
  })

  it('handles case with no mandate for change', () => {
    cy.visit('/case/X000003')
    const page = Page.verifyOnPage(CasePage)
    page.warnings().should('not.exist')
    page.changeTable().should('not.exist')
    cy.get('body').should(
      'contain.text',
      'This case has no mandate for change, so the change axis has been set to ZERO',
    )
  })

  it('handles case with no assessment', () => {
    cy.visit('/case/X000004')
    const page = Page.verifyOnPage(CasePage)
    page.warnings().should('not.exist')
    page.changeTable().should('not.exist')
    cy.get('body').should('contain.text', 'This case has not had an OASys assessment in the last 55 weeks')
  })
})
