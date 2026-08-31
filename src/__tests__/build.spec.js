import { launchPlaywrightWithExtension } from './helpers'

describe('install', () => {
  test('it installs the extension', async () => {
    const context = await launchPlaywrightWithExtension()
    const worker = await context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().startsWith('chrome-extension://'),
      timeout: 10000,
    })

    expect(await worker.evaluate(() => chrome.runtime.getManifest().manifest_version)).toBe(3)

    const extensionId = new URL(worker.url()).host
    const popup = await context.newPage()
    await popup.goto(`chrome-extension://${extensionId}/popup.html`)
    await popup.locator('#app > div').waitFor()

    const lightBackground = await popup.locator('#app > div').evaluate((element) => {
      document.body.classList.remove('dark')
      return getComputedStyle(element).backgroundColor
    })
    expect(lightBackground).toBe('rgb(249, 250, 252)')

    const darkBackground = await popup.locator('#app > div').evaluate((element) => {
      document.body.classList.add('dark')
      return getComputedStyle(element).backgroundColor
    })
    expect(darkBackground).toBe('rgb(22, 22, 22)')

    await context.close()
  }, 20000)
})
