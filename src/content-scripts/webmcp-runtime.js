import { customToolLimits, isHttpOrigin, parseToolDefinition } from '@/webmcp/tool-definition'

const MANAGER_TOOLS = new Set([
  'webmcp_define_tool',
  'webmcp_list_defined_tools',
  'webmcp_remove_tool',
])

function assertCurrentOrigin(expectedOrigin) {
  if (location.origin !== expectedOrigin || !isHttpOrigin(location.origin)) {
    throw new Error('The WebMCP tool document changed origin.')
  }
}

function getElement(selector) {
  let element
  try {
    element = document.querySelector(selector)
  } catch {
    throw new Error(`Invalid selector: ${selector}`)
  }
  if (!element) throw new Error(`Element not found: ${selector}`)
  return element
}

function isVisible(element) {
  if (!(element instanceof Element) || !element.isConnected) return false
  const style = getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
}

function setNativeValue(element, value) {
  const text = String(value)
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const prototype =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
    setter?.call(element, text)
    element.dispatchEvent(
      new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }),
    )
    element.dispatchEvent(new Event('change', { bubbles: true }))
    return
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    element.focus()
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(element)
    selection?.removeAllRanges()
    selection?.addRange(range)

    const previousText = element.textContent
    const container = document.createElement('div')
    container.textContent = text
    const inserted =
      typeof document.execCommand === 'function' &&
      document.execCommand('insertHTML', false, container.innerHTML)
    if (!inserted && element.textContent === previousText) {
      element.textContent = text
      element.dispatchEvent(
        new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }),
      )
    }
    return
  }

  throw new Error('The target does not accept text input.')
}

function waitFor(selector, state, timeoutMs, signal) {
  return new Promise((resolve, reject) => {
    const started = performance.now()
    const check = () => {
      if (signal?.aborted) {
        reject(new Error('The WebMCP tool call was cancelled.'))
        return
      }
      let element
      try {
        element = document.querySelector(selector)
      } catch {
        reject(new Error(`Invalid selector: ${selector}`))
        return
      }
      const ready = state === 'absent' ? !element : isVisible(element)
      if (ready) {
        resolve()
        return
      }
      if (performance.now() - started >= timeoutMs) {
        reject(new Error(`Timed out waiting for ${selector} to be ${state}.`))
        return
      }
      setTimeout(check, 50)
    }
    check()
  })
}

export default class WebMCPRuntime {
  constructor({ saveDefinition, removeDefinition } = {}) {
    this.saveDefinition = saveDefinition || (() => Promise.resolve())
    this.removeDefinition = removeDefinition || (() => Promise.resolve())
    this.managerController = null
    this.origin = null
    this.definitions = new Map()
    this.toolControllers = new Map()
    window.addEventListener('pagehide', () => this.disable(), { once: true })
  }

  status() {
    return {
      supported: typeof document.modelContext?.registerTool === 'function',
      enabled: Boolean(this.managerController),
      origin: location.origin,
      tools: [...this.definitions.keys()].sort(),
    }
  }

  async register(definitions = []) {
    if (!isHttpOrigin(location.origin)) {
      throw new Error('The WebMCP runtime is available only on HTTP or HTTPS pages.')
    }
    if (typeof document.modelContext?.registerTool !== 'function') {
      throw new Error('WebMCP is not enabled in this browser profile.')
    }
    if (this.managerController) {
      await this.restoreDefinitions(definitions)
      return this.status()
    }

    this.origin = location.origin
    const managerController = new AbortController()
    await Promise.all(
      this.managerDefinitions().map((tool) =>
        document.modelContext.registerTool(tool, { signal: managerController.signal }),
      ),
    )
    this.managerController = managerController

    try {
      await this.restoreDefinitions(definitions)
    } catch (error) {
      this.disable()
      throw error
    }
    return this.status()
  }

  async restoreDefinitions(values) {
    const restored = new Map(
      values.map((value) => {
        const definition = parseToolDefinition(value)
        return [definition.name, definition]
      }),
    )

    for (const name of [...this.definitions.keys()]) {
      if (!restored.has(name)) await this.remove(name, { persist: false })
    }
    for (const definition of restored.values()) {
      const current = this.definitions.get(definition.name)
      if (JSON.stringify(current) !== JSON.stringify(definition)) {
        await this.define(definition, { persist: false })
      }
    }
  }

  managerDefinitions() {
    return [
      {
        name: 'webmcp_define_tool',
        description:
          'Define or replace a page-local WebMCP tool made from bounded DOM actions. The tool is saved for this exact origin.',
        inputSchema: {
          type: 'object',
          properties: { definition: { type: ['object', 'string'] } },
          required: ['definition'],
          additionalProperties: false,
        },
        execute: ({ definition }) => this.define(definition),
      },
      {
        name: 'webmcp_list_defined_tools',
        description: 'List the custom WebMCP tools saved for this page origin.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: () => ({
          content: [{ type: 'text', text: JSON.stringify([...this.definitions.values()]) }],
        }),
      },
      {
        name: 'webmcp_remove_tool',
        description: 'Remove one custom WebMCP tool from this page origin.',
        inputSchema: {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
          additionalProperties: false,
        },
        execute: ({ name }) => this.remove(name),
      },
    ]
  }

  async define(value, { persist = true } = {}) {
    assertCurrentOrigin(this.origin)
    const definition = parseToolDefinition(value)
    if (MANAGER_TOOLS.has(definition.name)) throw new Error('That tool name is reserved.')
    if (
      !this.definitions.has(definition.name) &&
      this.definitions.size >= customToolLimits.definitionsPerOrigin
    ) {
      throw new Error('This origin already has the maximum number of custom tools.')
    }

    const previous = this.definitions.get(definition.name)
    this.toolControllers.get(definition.name)?.abort()
    const controller = new AbortController()
    try {
      await document.modelContext.registerTool(
        {
          name: definition.name,
          description: definition.description,
          inputSchema: definition.inputSchema,
          annotations: definition.annotations,
          execute: (input, options = {}) => this.execute(definition, input, options.signal),
        },
        { signal: controller.signal },
      )
      this.definitions.set(definition.name, definition)
      this.toolControllers.set(definition.name, controller)
      if (persist) await this.saveDefinition(definition)
    } catch (error) {
      controller.abort()
      if (previous) await this.define(previous, { persist: false })
      throw error
    }

    return {
      content: [{ type: 'text', text: `Defined WebMCP tool: ${definition.name}` }],
    }
  }

  async remove(name, { persist = true } = {}) {
    assertCurrentOrigin(this.origin)
    if (typeof name !== 'string' || !this.definitions.has(name)) {
      throw new Error(`Custom WebMCP tool not found: ${name}`)
    }
    this.toolControllers.get(name)?.abort()
    this.toolControllers.delete(name)
    this.definitions.delete(name)
    if (persist) await this.removeDefinition(name)
    return { content: [{ type: 'text', text: `Removed WebMCP tool: ${name}` }] }
  }

  async execute(definition, input, signal) {
    assertCurrentOrigin(this.origin)
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new Error(`${definition.name} input must be an object.`)
    }

    const results = {}
    for (const step of definition.steps) {
      if (signal?.aborted) throw new Error('The WebMCP tool call was cancelled.')

      if (step.op === 'wait') {
        await waitFor(step.selector, step.state, step.timeoutMs, signal)
        continue
      }

      const element = getElement(step.selector)
      if (step.op === 'type') {
        if (!(step.input in input)) throw new Error(`Missing tool input: ${step.input}`)
        setNativeValue(element, input[step.input])
      }
      if (step.op === 'click') {
        if (
          !(element instanceof HTMLElement) ||
          element.matches(':disabled,[aria-disabled="true"]')
        ) {
          throw new Error(`The click target is not enabled: ${step.selector}`)
        }
        element.click()
      }
      if (step.op === 'read') {
        results[step.as] =
          element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
            ? element.value
            : element.textContent?.trim() || ''
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: Object.keys(results).length
            ? JSON.stringify(results)
            : `Completed WebMCP tool: ${definition.name}`,
        },
      ],
    }
  }

  disable() {
    this.managerController?.abort()
    this.managerController = null
    for (const controller of this.toolControllers.values()) controller.abort()
    this.toolControllers.clear()
    this.definitions.clear()
    this.origin = null
    return this.status()
  }

  async handle(message) {
    if (message.type === 'WEBMCP_RUNTIME_STATUS') return this.status()
    if (message.type === 'WEBMCP_RUNTIME_ENABLE') return this.register(message.definitions)
    if (message.type === 'WEBMCP_RUNTIME_DISABLE') return this.disable()
    if (message.type === 'WEBMCP_RUNTIME_LIST') {
      if (!this.managerController) throw new Error('Enable the WebMCP runtime first.')
      const tools = await document.modelContext.getTools()
      return tools
        .filter((item) => item.window === window)
        .map(({ name, description, inputSchema, annotations, origin }) => ({
          name,
          description,
          inputSchema,
          annotations,
          origin,
        }))
    }
    if (message.type === 'WEBMCP_RUNTIME_CALL') {
      if (!this.managerController) throw new Error('Enable the WebMCP runtime first.')
      const input = message.input || {}
      const manager = this.managerDefinitions().find((item) => item.name === message.name)
      if (manager) return manager.execute(input)

      const definition = this.definitions.get(message.name)
      if (definition) return this.execute(definition, input)

      const tools = await document.modelContext.getTools()
      const tool = tools.find((item) => item.name === message.name && item.window === window)
      if (!tool) throw new Error(`WebMCP tool not found: ${message.name}`)
      return document.modelContext.executeTool(tool, JSON.stringify(input))
    }
    throw new Error('Unknown WebMCP runtime request.')
  }
}
