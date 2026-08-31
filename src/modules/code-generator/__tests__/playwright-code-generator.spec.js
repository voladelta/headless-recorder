import PlaywrightCodeGenerator from '..'
import { headlessActions } from '@/modules/code-generator/constants'

describe('PlaywrightCodeGenerator', () => {
  test('generates a Playwright Test', () => {
    const result = new PlaywrightCodeGenerator().generate([])

    expect(result).toContain("import { test } from '@playwright/test'")
    expect(result).toContain("test('recorded test', async ({ page }) => {")
  })

  test('generates locator actions for recorded interactions', () => {
    const events = [
      { action: 'click', selector: 'a.link' },
      {
        action: 'keydown',
        keyCode: 9,
        selector: 'input.value',
        value: 'I like turtles',
      },
      {
        action: 'change',
        selector: 'select#animals',
        tagName: 'SELECT',
        value: 'hamster',
      },
    ]

    expect(new PlaywrightCodeGenerator()._parseEvents(events)).toContain(
      `await page.locator("a.link").click()

  await page.locator("input.value").fill("I like turtles")

  await page.locator("select#animals").selectOption("hamster")`,
    )
  })

  test('uses the configured key to capture input', () => {
    const events = [
      { action: 'keydown', keyCode: 9, selector: 'input', value: 'ignored' },
      { action: 'keydown', keyCode: 13, selector: 'input', value: 'captured' },
    ]
    const result = new PlaywrightCodeGenerator({ keyCode: 13 })._parseEvents(events)

    expect(result).not.toContain('ignored')
    expect(result).toContain('.fill("captured")')
  })

  test('generates navigation and viewport actions', () => {
    const events = [
      { action: headlessActions.GOTO, href: 'https://example.com' },
      { action: headlessActions.VIEWPORT, value: { width: 1280, height: 720 } },
    ]
    const result = new PlaywrightCodeGenerator()._parseEvents(events)

    expect(result).toContain('await page.goto("https://example.com")')
    expect(result).toContain('await page.setViewportSize({ width: 1280, height: 720 })')
  })

  test('uses the matching Playwright frame for iframe events', () => {
    const events = [
      {
        action: 'click',
        selector: 'a.link',
        frameId: 123,
        frameUrl: 'https://example.com/frame',
      },
    ]
    const result = new PlaywrightCodeGenerator()._parseEvents(events)

    expect(result).toContain('const frame_123 = page.frame({ url: "https://example.com/frame" })')
    expect(result).toContain(
      'if (!frame_123) throw new Error("Frame not found: https://example.com/frame")',
    )
    expect(result).toContain('await frame_123.locator("a.link").click()')
  })

  test('generates page and locator screenshots', () => {
    const events = [
      { action: headlessActions.SCREENSHOT },
      { action: headlessActions.SCREENSHOT, value: '#capture-target' },
    ]
    const result = new PlaywrightCodeGenerator()._parseEvents(events)

    expect(result).toContain("await page.screenshot({ path: 'screenshot_1.png', fullPage: true })")
    expect(result).toContain(
      `await page.locator("#capture-target").screenshot({ path: 'screenshot_2.png' })`,
    )
  })

  test('escapes recorded selectors, input, and URLs as JavaScript strings', () => {
    const events = [
      { action: headlessActions.GOTO, href: "https://example.com/a'b" },
      {
        action: 'keydown',
        keyCode: 9,
        selector: 'input.\\value',
        value: "hello');\nconsole.log('world",
      },
    ]
    const result = new PlaywrightCodeGenerator()._parseEvents(events)

    expect(result).toContain(`page.goto("https://example.com/a'b")`)
    expect(result).toContain(`locator("input.\\\\value").fill("hello');\\nconsole.log('world")`)
  })

  test('can omit blank lines between actions', () => {
    const events = [
      { action: 'click', selector: 'button.first' },
      { action: 'click', selector: 'button.second' },
    ]
    const result = new PlaywrightCodeGenerator({ blankLinesBetweenBlocks: false })._parseEvents(
      events,
    )

    expect(result).toBe(
      `  await page.locator("button.first").click()\n  await page.locator("button.second").click()`,
    )
  })
})
