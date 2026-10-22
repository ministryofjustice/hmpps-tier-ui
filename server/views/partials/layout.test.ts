import path from 'path'
import nunjucks from 'nunjucks'

describe('page layout frontend components', () => {
  const environment = nunjucks.configure(
    [path.join(process.cwd(), 'server/views'), path.join(process.cwd(), 'node_modules/govuk-frontend/dist')],
    { autoescape: true },
  )
  environment.addFilter('assetMap', (url: string) => url)

  it('includes the stylesheets and scripts supplied with the frontend components', () => {
    const html = environment.render('partials/layout.njk', {
      feComponents: {
        header: '<header>Service header</header>',
        footer: '<footer>Service footer</footer>',
        cssIncludes: ['https://components.example/header.css', 'https://components.example/footer.css'],
        jsIncludes: ['https://components.example/header.js'],
      },
    })

    expect(html).toContain('<header>Service header</header>')
    expect(html).toContain('<footer>Service footer</footer>')
    expect(html).toContain('<link href="https://components.example/header.css" rel="stylesheet"/>')
    expect(html).toContain('<link href="https://components.example/footer.css" rel="stylesheet"/>')
    expect(html).toContain('<script src="https://components.example/header.js"></script>')
  })

  it('renders fallback components without adding external assets', () => {
    const html = environment.render('partials/layout.njk', {
      feComponents: {
        header: '<header>Fallback header</header>',
        footer: '<footer>Fallback footer</footer>',
        cssIncludes: [],
        jsIncludes: [],
      },
    })

    expect(html).toContain('<header>Fallback header</header>')
    expect(html).toContain('<footer>Fallback footer</footer>')
    expect(html).toContain('/assets/css/application.css')
    expect(html).not.toContain('https://components.example/')
  })
})
