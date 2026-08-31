import { launchPlaywrightWithExtension } from '@/__tests__/helpers'
import { waitForAndGetEvents, cleanEventLog, getEventLog, startServer } from './helpers'

let server
let port
let context
let page

describe('forms', () => {
  beforeAll(async () => {
    const buildDir = '../../../dist'
    const fixture = './fixtures/forms.html'
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

  const change = 1

  async function getInputEvents() {
    await page.waitForFunction(() =>
      window.headlessRecorder.recorder
        ._getEventLog()
        .some((event) => event.action === 'keydown' && event.keyCode === 9),
    )
    return getEventLog(page)
  }
  test('it should load the form', async () => {
    expect(await page.locator('form').count()).toBe(1)
  })

  test('it should record text input elements', async () => {
    const string = 'I like turtles'
    await page.locator('input[type="text"]').fill(string)
    await page.keyboard.press('Tab')

    const eventLog = await getInputEvents()
    const event = eventLog.find((e) => {
      return e.action === 'keydown' && e.keyCode === 9
    })
    expect(event.value).toEqual(string)
  })

  test('it should record textarea elements', async () => {
    const string = 'I like turtles\n but also cats'
    await page.locator('textarea').fill(string)
    await page.keyboard.press('Tab')

    const eventLog = await getInputEvents()
    const event = eventLog.find((e) => {
      return e.action === 'keydown' && e.keyCode === 9
    })
    expect(event.value).toEqual(string)
  })

  test('it should record radio input elements', async () => {
    await page.locator('#radioChoice1').click()
    await page.locator('#radioChoice3').click()
    const eventLog = await waitForAndGetEvents(page, 2 + 2 * change)
    expect(eventLog[0].value).toEqual('radioChoice1')
    expect(eventLog[2].value).toEqual('radioChoice3')
  })

  test('it should record select and option elements', async () => {
    await page.locator('select').selectOption('hamster')
    const eventLog = await waitForAndGetEvents(page, 1)
    expect(eventLog[0].value).toEqual('hamster')
    expect(eventLog[0].tagName).toEqual('SELECT')
  })

  test('it should record checkbox input elements', async () => {
    await page.locator('#checkbox1').click()
    await page.locator('#checkbox2').click()
    const eventLog = await waitForAndGetEvents(page, 2 + 2 * change)
    expect(eventLog[0].value).toEqual('checkbox1')
    expect(eventLog[2].value).toEqual('checkbox2')
  })
})
