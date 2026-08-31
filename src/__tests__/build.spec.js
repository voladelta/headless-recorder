import { launchPlaywrightWithExtension } from './helpers'
import { startServer } from '@/content-scripts/__tests__/helpers'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { fileURLToPath } from 'node:url'

describe('install', () => {
  test('it installs the extension', async () => {
    const context = await launchPlaywrightWithExtension()
    const worker = await context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().startsWith('chrome-extension://'),
      timeout: 10000,
    })

    const manifest = await worker.evaluate(() => chrome.runtime.getManifest())
    expect(manifest.manifest_version).toBe(3)
    expect(manifest.permissions).not.toContain('cookies')

    const extensionId = new URL(worker.url()).host
    const popup = await context.newPage()
    await popup.goto(`chrome-extension://${extensionId}/popup.html`)
    await popup.locator('#app > div').waitFor()
    expect(await popup.getByText('Run on Checkly').count()).toBe(0)

    const lightBackground = await popup.locator('#app > div').evaluate((element) => {
      document.body.classList.remove('dark')
      return getComputedStyle(element).backgroundColor
    })
    expect(lightBackground).toBe('rgb(249, 250, 252)')
    expect(
      await popup.locator('.header__title').evaluate((element) => getComputedStyle(element).color),
    ).toBe('rgb(31, 45, 61)')

    const darkBackground = await popup.locator('#app > div').evaluate((element) => {
      document.body.classList.add('dark')
      return getComputedStyle(element).backgroundColor
    })
    expect(darkBackground).toBe('rgb(22, 22, 22)')
    expect(
      await popup.locator('.header__title').evaluate((element) => getComputedStyle(element).color),
    ).toBe('rgb(249, 250, 252)')
    expect(
      await popup
        .locator('.home__record-button')
        .evaluate((element) => getComputedStyle(element).borderColor),
    ).toBe('rgb(60, 72, 88)')

    await context.close()
  }, 20000)

  test('injects post_message and updates the local page through WebMCP', async () => {
    const demoPage = fileURLToPath(new URL('../demo/index.html', import.meta.url))
    const { server, port } = await startServer('../../../dist', demoPage)
    const context = await launchPlaywrightWithExtension()
    try {
      const worker =
        context
          .serviceWorkers()
          .find((candidate) => candidate.url().startsWith('chrome-extension://')) ||
        (await context.waitForEvent('serviceworker', {
          predicate: (candidate) => candidate.url().startsWith('chrome-extension://'),
          timeout: 10000,
        }))
      const extensionId = new URL(worker.url()).host
      const target = await context.newPage()
      const targetUrl = `http://127.0.0.1:${port}/`
      await target.goto(targetUrl)
      expect(await target.locator('[data-webmcp-post-target]').count()).toBe(1)
      const tab = await worker.evaluate(async (url) => {
        const [found] = await chrome.tabs.query({ url })
        return found
      }, targetUrl)

      await worker.evaluate(
        async ({ tabId }) => {
          await chrome.scripting.executeScript({
            target: { tabId, frameIds: [0] },
            world: 'ISOLATED',
            func: () => {
              let registeredTool = null
              document.modelContext = {
                async registerTool(tool, options) {
                  if (!(options?.signal instanceof AbortSignal)) {
                    throw new Error('Registration signal is required.')
                  }
                  registeredTool = tool
                  options.signal.addEventListener(
                    'abort',
                    () => {
                      registeredTool = null
                    },
                    { once: true },
                  )
                },
              }
              globalThis.controlledWebMCPPost = {
                execute(input) {
                  if (!registeredTool) throw new Error('post_message is not registered.')
                  return registeredTool.execute(input)
                },
              }
            },
          })
        },
        { tabId: tab.id },
      )
      const popup = await context.newPage()
      await popup.goto(`chrome-extension://${extensionId}/popup.html`)
      await target.bringToFront()
      expect(
        await worker.evaluate(async () => {
          const [active] = await chrome.tabs.query({ active: true, currentWindow: true })
          return active.id
        }),
      ).toBe(tab.id)
      await popup.evaluate(() =>
        Array.from(document.querySelectorAll('button'))
          .find((button) => button.textContent.trim() === 'Inject post_message')
          .click(),
      )
      await expect
        .poll(() => popup.locator('.webmcp-post p').textContent())
        .toBe('post_message is ready for Brave MCP.')
      const bridgeState = await worker.evaluate(
        async ({ tabId }) => {
          const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId, frameIds: [0] },
            world: 'ISOLATED',
            func: () => ({
              bridge: Boolean(window.headlessWebMCPPost),
              context: Boolean(document.modelContext),
              target: Boolean(document.querySelector('[data-webmcp-post-target]')),
              chrome: typeof chrome,
              runtime: Boolean(chrome.runtime),
              onMessage: Boolean(chrome.runtime?.onMessage),
            }),
          })
          return result
        },
        { tabId: tab.id },
      )
      expect(bridgeState).toEqual({
        bridge: true,
        context: true,
        target: true,
        chrome: 'object',
        runtime: true,
        onMessage: true,
      })
      const result = await worker.evaluate(
        async ({ tabId }) => {
          const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId, frameIds: [0] },
            world: 'ISOLATED',
            func: () =>
              globalThis.controlledWebMCPPost.execute({
                text: '<strong>Hello from WebMCP</strong>',
              }),
          })
          return result
        },
        { tabId: tab.id },
      )
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Message appended to the local demo page.' }],
      })
      expect(await target.locator('[data-webmcp-post]').textContent()).toBe(
        '<strong>Hello from WebMCP</strong>',
      )
      expect(await target.locator('[data-webmcp-post] strong').count()).toBe(0)
    } finally {
      await context.close()
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
    }
  }, 20000)

  test('defines and calls page tools through the MCP to WebMCP bridge', async () => {
    const demoPage = fileURLToPath(new URL('../demo/index.html', import.meta.url))
    const bridgePath = fileURLToPath(new URL('../bridge/server.js', import.meta.url))
    const { server, port } = await startServer('../../../dist', demoPage)
    const context = await launchPlaywrightWithExtension()
    const client = new Client({ name: 'headless-recorder-integration', version: '1.0.0' })
    const transport = new StdioClientTransport({ command: 'bun', args: [bridgePath] })

    try {
      await client.connect(transport)
      const worker =
        context
          .serviceWorkers()
          .find((candidate) => candidate.url().startsWith('chrome-extension://')) ||
        (await context.waitForEvent('serviceworker', {
          predicate: (candidate) => candidate.url().startsWith('chrome-extension://'),
          timeout: 10000,
        }))
      const extensionId = new URL(worker.url()).host
      const target = await context.newPage()
      const targetUrl = `http://127.0.0.1:${port}/`
      await target.goto(targetUrl)
      await target.evaluate(() => {
        const button = document.createElement('button')
        button.id = 'bridge-trigger'
        button.type = 'button'
        button.textContent = 'Trigger bridge test'
        const output = document.createElement('output')
        output.id = 'bridge-output'
        output.textContent = 'Idle'
        button.addEventListener('click', () => {
          output.textContent = 'Triggered'
        })
        document.body.append(button, output)
      })
      const tab = await worker.evaluate(async (url) => {
        const [found] = await chrome.tabs.query({ url })
        return found
      }, targetUrl)
      await worker.evaluate(
        async ({ tabId }) => {
          await chrome.scripting.executeScript({
            target: { tabId, frameIds: [0] },
            world: 'ISOLATED',
            func: () => {
              const tools = new Map()
              document.modelContext = {
                async registerTool(tool, options) {
                  tools.set(tool.name, tool)
                  options.signal.addEventListener('abort', () => tools.delete(tool.name), {
                    once: true,
                  })
                },
                async getTools() {
                  return [...tools.values()].map((tool) => ({ ...tool, window }))
                },
                async executeTool(tool, input) {
                  return tool.execute(JSON.parse(input))
                },
              }
            },
          })
        },
        { tabId: tab.id },
      )

      const popup = await context.newPage()
      await popup.goto(`chrome-extension://${extensionId}/popup.html`)
      await popup.getByRole('button', { name: 'Connect agent bridge' }).click()
      await target.bringToFront()

      await expect
        .poll(async () => {
          try {
            const result = await client.callTool({ name: 'webmcp_list_tools', arguments: {} })
            return result.content[0].text.includes('webmcp_define_tool')
          } catch {
            return false
          }
        })
        .toBe(true)

      const typeDefinition = {
        name: 'type_post',
        description: 'Type text into the demo post field.',
        inputSchema: {
          type: 'object',
          properties: { text: { type: 'string' } },
          required: ['text'],
        },
        steps: [
          {
            op: 'type',
            selector: '[data-webmcp-test-form] input[name="text"]',
            input: 'text',
          },
        ],
      }
      await client.callTool({
        name: 'webmcp_call_tool',
        arguments: {
          name: 'webmcp_define_tool',
          input: { definition: typeDefinition },
        },
      })
      await client.callTool({
        name: 'webmcp_call_tool',
        arguments: { name: 'type_post', input: { text: 'Typed through MCP and WebMCP' } },
      })
      expect(await target.locator('[data-webmcp-test-form] input').inputValue()).toBe(
        'Typed through MCP and WebMCP',
      )

      await client.callTool({
        name: 'webmcp_call_tool',
        arguments: {
          name: 'webmcp_define_tool',
          input: {
            definition: {
              name: 'trigger_post',
              description: 'Select the demo trigger and report its result.',
              inputSchema: { type: 'object', properties: {} },
              annotations: { destructiveHint: true },
              steps: [
                { op: 'click', selector: '#bridge-trigger' },
                { op: 'read', selector: '#bridge-output', as: 'status' },
              ],
            },
          },
        },
      })
      const result = await client.callTool({
        name: 'webmcp_call_tool',
        arguments: { name: 'trigger_post', input: {} },
      })
      expect(await target.locator('#bridge-output').textContent()).toBe('Triggered')
      expect(result.content[0].text).toContain('Triggered')

      await popup.getByRole('button', { name: 'Disable', exact: true }).click()
      await target.bringToFront()
      const restored = await client.callTool({ name: 'webmcp_list_tools', arguments: {} })
      expect(restored.content[0].text).toContain('type_post')
      expect(restored.content[0].text).toContain('trigger_post')
    } finally {
      await client.close()
      await context.close()
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
    }
  }, 30000)
})
