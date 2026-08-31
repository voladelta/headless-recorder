import { headlessActions, eventsToRecord } from '@/modules/code-generator/constants'

export const defaults = {
  blankLinesBetweenBlocks: true,
  dataAttribute: '',
  keyCode: 9,
}

const quote = (value) => JSON.stringify(String(value))

export default class PlaywrightCodeGenerator {
  constructor(options = {}) {
    this._options = { ...defaults, ...options }
  }

  generate(events) {
    const body = this._parseEvents(events)
    const testBody = body ? `${body}\n` : ''

    return `import { test } from '@playwright/test'

test('recorded test', async ({ page }) => {
${testBody}})
`
  }

  _parseEvents(events) {
    if (!events?.length) {
      return ''
    }

    const blocks = []
    const declaredFrames = new Set()
    let screenshotCounter = 0

    for (const event of events) {
      const frame = event.frameId ? `frame_${event.frameId}` : 'page'
      const usesFrame =
        [
          eventsToRecord.KEYDOWN,
          eventsToRecord.CLICK,
          eventsToRecord.CHANGE,
          headlessActions.GOTO,
        ].includes(event.action) ||
        (event.action === headlessActions.SCREENSHOT && event.value)

      if (usesFrame && event.frameId && !declaredFrames.has(event.frameId)) {
        blocks.push([
          `  const ${frame} = page.frame({ url: ${quote(event.frameUrl)} })`,
          `  if (!${frame}) throw new Error(${quote(`Frame not found: ${event.frameUrl}`)})`,
        ])
        declaredFrames.add(event.frameId)
      }

      switch (event.action) {
        case eventsToRecord.KEYDOWN:
          if (event.keyCode === this._options.keyCode) {
            blocks.push([
              `  await ${frame}.locator(${quote(event.selector)}).fill(${quote(event.value ?? '')})`,
            ])
          }
          break
        case eventsToRecord.CLICK:
          blocks.push([`  await ${frame}.locator(${quote(event.selector)}).click()`])
          break
        case eventsToRecord.CHANGE:
          if (event.tagName === 'SELECT') {
            blocks.push([
              `  await ${frame}.locator(${quote(event.selector)}).selectOption(${quote(event.value)})`,
            ])
          }
          break
        case headlessActions.GOTO:
          blocks.push([`  await ${frame}.goto(${quote(event.href)})`])
          break
        case headlessActions.VIEWPORT:
          blocks.push([
            `  await page.setViewportSize({ width: ${event.value.width}, height: ${event.value.height} })`,
          ])
          break
        case headlessActions.SCREENSHOT:
          screenshotCounter += 1
          if (event.value) {
            blocks.push([
              `  await ${frame}.locator(${quote(event.value)}).screenshot({ path: 'screenshot_${screenshotCounter}.png' })`,
            ])
          } else {
            blocks.push([
              `  await page.screenshot({ path: 'screenshot_${screenshotCounter}.png', fullPage: true })`,
            ])
          }
          break
      }
    }

    const separator = this._options.blankLinesBetweenBlocks ? '\n\n' : '\n'
    return blocks.map((block) => block.join('\n')).join(separator)
  }
}
