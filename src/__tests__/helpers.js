import { exec as execCallback } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execCallback)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extensionPath = path.join(__dirname, '../../dist')

export const launchPuppeteerWithExtension = async function (puppeteer) {
  const options = {
    headless: false,
    ignoreHTTPSErrors: true,
    devtools: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  }

  if (process.env.PUPPETEER_EXEC_PATH) {
    options.executablePath = process.env.PUPPETEER_EXEC_PATH
  } else {
    options.executablePath = await puppeteer.executablePath()
  }

  return puppeteer.launch(options)
}

export const runBuild = function () {
  return exec('bun run build')
}
