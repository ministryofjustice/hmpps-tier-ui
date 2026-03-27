import CasePage from './case'

export default class SummaryPage extends CasePage {
  summaryPanel = () => cy.contains('h2', 'Summary').parent()

  summaryText = () => this.summaryPanel().find('p').first()

  summaryRow = (label: string) => this.summaryPanel().contains('tbody tr', label)

  summaryLink = (label: string) => this.summaryPanel().contains('tbody tr a', label)
}
