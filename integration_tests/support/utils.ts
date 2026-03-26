export function normaliseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function expectNormalisedText(element: Cypress.Chainable, expectedText: string): void {
  element.invoke('text').then(text => {
    expect(normaliseWhitespace(text)).to.contain(expectedText)
  })
}
