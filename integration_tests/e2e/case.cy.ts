import CasePage from '../pages/case'
import Page from '../pages/page'

context('Case view screen', () => {
  it('displays case details header', () => {
    cy.visit('/case/A000001')
    const page = Page.verifyOnPage(CasePage)
    page.headerCrn().should('contain.text', 'A000001')
    page.headerSex().should('contain.text', 'Female')
    page.headerTier().should('contain.text', 'B2')
    page.warnings().should('not.exist')
  })

  it('displays protect section', () => {
    cy.visit('/case/A000001')
    const page = Page.verifyOnPage(CasePage)
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
    cy.get(page.protectTableRow(8)).should('contain.text', 'Parenting responsibilities').should('contain.text', '+2')
    cy.get(page.protectTableRow(9))
      .should('contain.text', 'Impulsivity and temper control')
      .should('contain.text', '+2')
    cy.get(page.protectTableRow(10)).should('contain.text', 'Total').should('contain.text', '33')
  })

  it('displays change section', () => {
    cy.visit('/case/A000001')
    const page = Page.verifyOnPage(CasePage)
    cy.get(page.changeTableRow(1))
      .should('contain.text', 'OGRS')
      .should('contain.text', '56.7%')
      .should('contain.text', '+5')
    cy.get(page.changeTableRow(2))
      .should('contain.text', 'IOM')
      .should('contain.text', 'Yes')
      .should('contain.text', '+2')
      .should('not.contain.text', 'superseded')
    cy.get(page.changeTableRow(3)).should('contain.text', 'Criminogenic needs')
    cy.get(page.changeTableRow(4)).should('contain.text', 'Relationships').should('contain.text', '+1')
    cy.get(page.changeTableRow(5)).should('contain.text', 'Lifestyle and associates').should('contain.text', '+1')
    cy.get(page.changeTableRow(6)).should('contain.text', 'Alcohol misuse').should('contain.text', '+1')
    cy.get(page.changeTableRow(7))
      .should('contain.text', 'Thinking and behaviour')
      .should('contain.text', 'SEVERE')
      .should('contain.text', '+4')
    cy.get(page.changeTableRow(8)).should('contain.text', 'Total').should('contain.text', '14')
  })

  it('displays history', () => {
    cy.visit('/case/A000001')
    const page = Page.verifyOnPage(CasePage)
    cy.get(page.timelineItem(1))
      .should('contain.text', 'B2')
      .should('contain.text', '7 December 2023 at 12:05 PM')
      .should('contain.text', 'A breach was raised')
    cy.get(page.timelineItem(2))
      .should('contain.text', 'C2')
      .should('contain.text', '13 October 2023 at 11:10 AM')
      .should('contain.text', "A registration of type 'MAPPA' was added")
    cy.get(page.timelineItem(3))
      .should('contain.text', 'D2')
      .should('contain.text', '28 July 2023 at 5:09 PM')
      .should('contain.text', 'An OASys assessment was produced')
    cy.get(page.timelineItem(4)).should('contain.text', 'C0').should('contain.text', '7 October 2023 at 12:12 PM')
    cy.get(page.timelineItem(5))
      .should('contain.text', 'D0')
      .should('contain.text', '7 October 2023 at 9:34 AM')
      .should('contain.text', 'The case was created')
  })

  it('handles multiple rosh registrations', () => {
    cy.visit('/case/A000002')
    const page = Page.verifyOnPage(CasePage)
    page.warnings().should('contain.text', 'Multiple RoSH registrations were found in Delius')
    page.protectTable().should('not.contain.text', 'High RoSH')
    cy.get(page.protectTableRow(1)).should('contain.text', 'Medium RoSH')
  })

  it('handles case with no mandate for change', () => {
    cy.visit('/case/A000003')
    const page = Page.verifyOnPage(CasePage)
    page.warnings().should('not.exist')
    page.changeTable().should('not.exist')
    cy.get('body').should(
      'contain.text',
      'This case has no mandate for change, so the change axis has been set to ZERO',
    )
  })

  it('handles case with no assessment', () => {
    cy.visit('/case/A000004')
    const page = Page.verifyOnPage(CasePage)
    page.warnings().should('not.exist')
    page.changeTable().should('not.exist')
    cy.get('body').should('contain.text', 'This case has not had an OASys assessment in the last 55 weeks')
  })

  it('handles case with limited access', () => {
    cy.visit('/case/A000005')
    cy.get('body').should('contain.text', 'You are not authorised to view this case')
  })
})
