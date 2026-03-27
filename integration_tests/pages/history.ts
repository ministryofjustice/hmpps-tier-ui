import CasePage from './case'

export default class HistoryPage extends CasePage {
  historyItems = () => cy.get('.moj-timeline__item')

  historyItem = (row: number) => cy.get(this.timelineItem(row))
}
