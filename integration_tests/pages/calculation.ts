import CasePage from './case'

export default class CalculationPage extends CasePage {
  section = (id: string) => cy.get(`#${id}`)

  reoffendingSummary = () => cy.get('#reoffending + p')

  sexualReoffendingSummary = () => cy.get('#sexualReoffending + p')

  mappaRoshSummary = () => cy.get('#mappaRosh + p')

  liferIppSummary = () => cy.get('#liferIpp + p')

  registrationRow = (id: string) => cy.get(`#${id}`).closest('tr')
}
