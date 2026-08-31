import { launchPlaywrightWithExtension } from '@/__tests__/helpers'
import { waitForAndGetEvents, cleanEventLog, startServer } from './helpers'

let server
let port
let context
let page

describe('attributes', () => {
  beforeAll(async () => {
    const buildDir = '../../../dist'
    const fixture = './fixtures/attributes.html'
    {
      const { server: _s, port: _p } = await startServer(buildDir, fixture)
      server = _s
      port = _p
    }
  }, 20000)

  afterAll(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  })

  beforeEach(async () => {
    context = await launchPlaywrightWithExtension()
    page = await context.newPage()
    await page.goto(`http://localhost:${port}/`)
    await cleanEventLog(page)
  })

  afterEach(async () => {
    await context?.close()
  })

  test('it should load the content', async () => {
    expect(await page.locator('#content-root').count()).toBe(1)
  })

  test('it should use data attributes throughout selector', async () => {
    await page.evaluate('window.headlessRecorder.store.commit("setDataAttribute", "data-qa")')
    await page.locator('span').click()

    const event = (await waitForAndGetEvents(page, 1))[0]
    expect(event.selector).toEqual(
      'body > #content-root > [data-qa="article-wrapper"] > [data-qa="article-body"] > span',
    )
  })

  test('it should use data attributes throughout selector even when id is set', async () => {
    await page.evaluate('window.headlessRecorder.store.commit("setDataAttribute", "data-qa")')
    await page.locator('#link').click()

    const event = (await waitForAndGetEvents(page, 1))[0]
    expect(event.selector).toEqual('[data-qa="link"]')
  })

  test('it should use id throughout selector when data attributes is not set', async () => {
    await page.evaluate('window.headlessRecorder.store.commit("setDataAttribute", null)')
    await page.locator('#link').click()

    const event = (await waitForAndGetEvents(page, 1))[0]
    expect(event.selector).toEqual('#link')
  })
})
