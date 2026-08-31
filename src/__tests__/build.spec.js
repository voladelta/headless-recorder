import puppeteer from 'puppeteer'
import { launchPuppeteerWithExtension } from './helpers'

describe('install', () => {
  test('it installs the extension', async () => {
    const browser = await launchPuppeteerWithExtension(puppeteer)
    const workerTarget = await browser.waitForTarget(
      (target) =>
        target.type() === 'service_worker' && target.url().startsWith('chrome-extension://'),
      { timeout: 10000 },
    )
    const worker = await workerTarget.worker()

    expect(await worker.evaluate(() => chrome.runtime.getManifest().manifest_version)).toBe(3)

    const extensionId = new URL(workerTarget.url()).host
    const popup = await browser.newPage()
    await popup.goto(`chrome-extension://${extensionId}/popup.html`)
    await popup.waitForSelector('#app > div')

    const lightBackground = await popup.$eval('#app > div', (element) => {
      document.body.classList.remove('dark')
      return getComputedStyle(element).backgroundColor
    })
    expect(lightBackground).toBe('rgb(249, 250, 252)')

    const darkBackground = await popup.$eval('#app > div', (element) => {
      document.body.classList.add('dark')
      return getComputedStyle(element).backgroundColor
    })
    expect(darkBackground).toBe('rgb(22, 22, 22)')

    await browser.close()
  }, 20000)
})
