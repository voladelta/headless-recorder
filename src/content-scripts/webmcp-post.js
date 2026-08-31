const TOOL_NAME = 'post_message'
const TARGET_SELECTOR = '[data-webmcp-post-target]'
const MAX_TEXT_LENGTH = 1000

function isLoopbackOrigin(origin) {
  try {
    const url = new URL(origin)
    return (
      url.protocol === 'http:' &&
      (url.hostname === '127.0.0.1' || url.hostname === 'localhost') &&
      url.origin === origin
    )
  } catch {
    return false
  }
}

export default class WebMCPPostTool {
  constructor() {
    this.controller = null
    window.addEventListener('pagehide', () => this.disable(), { once: true })
  }

  status() {
    return {
      supported: typeof document.modelContext?.registerTool === 'function',
      enabled: Boolean(this.controller),
      origin: location.origin,
    }
  }

  async register() {
    if (!isLoopbackOrigin(location.origin)) {
      throw new Error('post_message is available only on the local WebMCP demo page.')
    }
    if (!document.querySelector(TARGET_SELECTOR)) {
      throw new Error('The local WebMCP demo target is missing.')
    }
    if (typeof document.modelContext?.registerTool !== 'function') {
      throw new Error('WebMCP is not enabled in this browser profile.')
    }
    if (this.controller) return this.status()

    const controller = new AbortController()
    await document.modelContext.registerTool(
      {
        name: TOOL_NAME,
        description: 'Append plain text to the local Headless Recorder WebMCP demo page.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', minLength: 1, maxLength: MAX_TEXT_LENGTH },
          },
          required: ['text'],
          additionalProperties: false,
        },
        execute: (input, options = {}) => {
          if (options.signal?.aborted) throw new Error('post_message was cancelled.')
          if (!input || typeof input !== 'object' || Array.isArray(input)) {
            throw new Error('post_message input must be an object.')
          }
          const { text } = input
          if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_LENGTH) {
            throw new Error(`post_message text must be 1 to ${MAX_TEXT_LENGTH} characters.`)
          }
          if (!isLoopbackOrigin(location.origin)) {
            throw new Error('post_message is no longer on an approved loopback origin.')
          }
          const target = document.querySelector(TARGET_SELECTOR)
          if (!target) throw new Error('The local WebMCP demo target is missing.')

          const item = document.createElement('p')
          item.dataset.webmcpPost = ''
          item.textContent = text
          target.append(item)
          if (options.signal?.aborted) {
            item.remove()
            throw new Error('post_message was cancelled.')
          }
          return {
            content: [{ type: 'text', text: 'Message appended to the local demo page.' }],
          }
        },
      },
      { signal: controller.signal },
    )
    this.controller = controller
    return this.status()
  }

  disable() {
    this.controller?.abort()
    this.controller = null
    return this.status()
  }

  handle(message) {
    if (message.type === 'WEBMCP_POST_STATUS') return this.status()
    if (message.type === 'WEBMCP_POST_REGISTER') return this.register()
    if (message.type === 'WEBMCP_POST_DISABLE') return this.disable()
    throw new Error('Unknown post_message request.')
  }
}
