import { exec as execCallback } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { chromium } from '@playwright/test'

const exec = promisify(execCallback)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extensionPath = path.join(__dirname, '../../dist')

export const launchPlaywrightWithExtension = function () {
  const options = {
    headless: false,
    ignoreHTTPSErrors: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  }

  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    options.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  }

  return chromium.launchPersistentContext('', options)
}

export const runBuild = function () {
  return exec('bun run build')
}
