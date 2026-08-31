import badge from '@/services/badge'
import browser from '@/services/browser'
import storage from '@/services/storage'
import { popupActions, recordingControls } from '@/services/constants'
import { overlayActions } from '@/modules/overlay/constants'
import { headlessActions } from '@/modules/code-generator/constants'

import CodeGenerator from '@/modules/code-generator'
import { customToolLimits, isHttpOrigin, parseToolDefinition } from '@/webmcp/tool-definition'

const CUSTOM_TOOLS_STORAGE_KEY = 'webmcpCustomTools'
const BRIDGE_ENABLED_STORAGE_KEY = 'webmcpBridgeEnabled'
const BRIDGE_URL = 'ws://127.0.0.1:9321/extension'
const BRIDGE_RECONNECT_MS = 2_000

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

class Background {
  constructor() {
    this._recording = []
    this._badgeState = ''
    this._isRecording = false
    this._isPaused = false
    this._hasGoto = false
    this._hasViewPort = false
    this._queue = Promise.resolve()
    this._definitionQueue = Promise.resolve()
    this._bridgeEnabled = false
    this._bridgeSocket = null
    this._bridgeReconnectTimer = null
  }

  init() {
    chrome.runtime.onConnect.addListener((port) => {
      port.onMessage.addListener((msg) => {
        this.enqueue(() => this.handlePopupMessage(msg))
      })
    })

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg?.type?.startsWith('WEBMCP_BRIDGE_')) {
        const request = this.handleBridgeControlMessage(msg)
        request.then(
          (value) => sendResponse({ ok: true, value }),
          (error) =>
            sendResponse({ ok: false, error: String(error?.message || error).slice(0, 500) }),
        )
        return true
      }
      if (msg?.type?.startsWith('WEBMCP_DEFINITION_')) {
        const request = this._definitionQueue.then(() => this.handleDefinitionMessage(msg, sender))
        this._definitionQueue = request.catch((error) => console.error(error))
        request.then(
          (value) => sendResponse({ ok: true, value }),
          (error) =>
            sendResponse({ ok: false, error: String(error?.message || error).slice(0, 500) }),
        )
        return true
      }
      if (msg?.type?.startsWith('WEBMCP_RUNTIME_')) {
        const request = this._queue.then(() => this.handleRuntimeToolMessage(msg))
        this._queue = request.catch((error) => console.error(error))
        request.then(
          (value) => sendResponse({ ok: true, value }),
          (error) =>
            sendResponse({ ok: false, error: String(error?.message || error).slice(0, 500) }),
        )
        return true
      }
      if (msg?.type?.startsWith('WEBMCP_POST_')) {
        const request = this._queue
          .then(() => this.restoreState())
          .then(() => this.handlePostToolMessage(msg))
        this._queue = request.catch((error) => console.error(error))
        request.then(
          (value) => sendResponse({ ok: true, value }),
          (error) =>
            sendResponse({ ok: false, error: String(error?.message || error).slice(0, 500) }),
        )
        return true
      }
      this.enqueue(() => this.handleMessage(msg, sender))
    })

    chrome.webNavigation.onCompleted.addListener((details) => {
      this.enqueue(() => this.handleNavigation(details))
    })

    chrome.webNavigation.onBeforeNavigate.addListener(() => {
      this.enqueue(() => this.handleBeforeNavigate())
    })

    storage.get(BRIDGE_ENABLED_STORAGE_KEY).then(({ [BRIDGE_ENABLED_STORAGE_KEY]: enabled }) => {
      this._bridgeEnabled = Boolean(enabled)
      if (this._bridgeEnabled) this.openBridgeConnection()
    })
  }

  enqueue(task) {
    this._queue = this._queue
      .then(() => this.restoreState())
      .then(task)
      .catch((error) => console.error(error))

    return this._queue
  }

  async restoreState() {
    const {
      recording = [],
      controls = {},
      recorderState = {},
    } = await storage.get(['recording', 'controls', 'recorderState'])

    this._recording = recording
    this._isRecording = Boolean(controls.isRecording)
    this._isPaused = Boolean(controls.isPaused)
    this._badgeState = recorderState.badgeState || ''
    this._hasGoto = Boolean(recorderState.hasGoto)
    this._hasViewPort = Boolean(recorderState.hasViewPort)
  }

  persistState() {
    return storage.set({
      recording: this._recording,
      controls: {
        isRecording: this._isRecording,
        isPaused: this._isPaused,
      },
      recorderState: {
        badgeState: this._badgeState,
        hasGoto: this._hasGoto,
        hasViewPort: this._hasViewPort,
      },
    })
  }

  async start() {
    await this.cleanUp()

    this._isRecording = true
    this._badgeState = ''
    this._hasGoto = false
    this._hasViewPort = false
    await this.persistState()

    await browser.injectContentScript()
    await this.toggleOverlay({ open: true, clear: true })

    badge.start()
  }

  async stop() {
    this._badgeState = this._recording.length > 0 ? '1' : ''
    this._isRecording = false

    badge.stop(this._badgeState)
    await this.persistState()
  }

  async pause() {
    badge.pause()
    this._isPaused = true
    await this.persistState()
  }

  async unPause() {
    badge.start()
    this._isPaused = false
    await this.persistState()
  }

  async cleanUp() {
    this._recording = []
    this._isRecording = false
    this._isPaused = false
    this._badgeState = ''
    this._hasGoto = false
    this._hasViewPort = false
    badge.reset()
    await this.persistState()
  }

  async recordEvent(msg, sender) {
    if (!this._isRecording || this._isPaused) {
      return
    }

    msg.frameId = sender?.frameId ?? null
    msg.frameUrl = sender?.url ?? null
    this._recording.push(msg)
    await this.persistState()
  }

  async recordCurrentUrl(href, sender) {
    if (!this._hasGoto) {
      this._hasGoto = true
      await this.recordEvent(
        {
          selector: undefined,
          value: undefined,
          action: headlessActions.GOTO,
          href,
        },
        sender,
      )
    }
  }

  async recordCurrentViewportSize(value, sender) {
    if (!this._hasViewPort) {
      this._hasViewPort = true
      await this.recordEvent(
        {
          selector: undefined,
          value,
          action: headlessActions.VIEWPORT,
        },
        sender,
      )
    }
  }

  recordScreenshot(value, sender) {
    return this.recordEvent(
      {
        selector: undefined,
        value,
        action: headlessActions.SCREENSHOT,
      },
      sender,
    )
  }

  // handleMenuInteraction(info, tab) {
  // }

  async handleMessage(msg, sender) {
    if (msg.control) {
      if (Object.values(recordingControls).includes(msg.control)) {
        return this.handleRecordingMessage(msg, sender)
      }

      return this.handleOverlayMessage(msg)
    }

    if (msg.type === 'SIGN_CONNECT' || !this._isRecording) {
      return
    }

    await this.recordEvent(msg, sender)
  }

  async handleOverlayMessage({ control }) {
    if (!control) {
      return
    }

    if (control === overlayActions.RESTART) {
      await storage.set({ restart: true, clear: false })
      await this.start()
    }

    if (control === overlayActions.CLOSE) {
      await this.toggleOverlay()
    }

    if (control === overlayActions.COPY) {
      try {
        const { options = {} } = await storage.get('options')
        const generator = new CodeGenerator(options.code)
        const code = generator.generate(this._recording)

        await browser.sendTabMessage({
          action: 'CODE',
          value: code,
        })
      } catch {
        await browser.sendTabMessage({ action: 'CODE_COPY_ERROR' })
      }
    }

    if (control === overlayActions.STOP) {
      await storage.set({ clear: true, pause: false, restart: false })
      await this.stop()
    }

    if (control === overlayActions.UNPAUSE) {
      await storage.set({ pause: false })
      await this.unPause()
    }

    if (control === overlayActions.PAUSE) {
      await storage.set({ pause: true })
      await this.pause()
    }

    // TODO: the next 3 events do not need to be listened in background
    // content script controller, should be able to handle that directly from overlay
    if (control === overlayActions.CLIPPED_SCREENSHOT) {
      await browser.sendTabMessage({ action: overlayActions.TOGGLE_SCREENSHOT_CLIPPED_MODE })
    }

    if (control === overlayActions.FULL_SCREENSHOT) {
      await browser.sendTabMessage({ action: overlayActions.TOGGLE_SCREENSHOT_MODE })
    }

    if (control === overlayActions.ABORT_SCREENSHOT) {
      await browser.sendTabMessage({ action: overlayActions.CLOSE_SCREENSHOT_MODE })
    }
  }

  async handleRecordingMessage({ control, href, value, coordinates }, sender) {
    if (!this._isRecording) {
      return
    }

    if (control === recordingControls.EVENT_RECORDER_STARTED) {
      badge.setText(this._badgeState)
    }

    if (control === recordingControls.GET_VIEWPORT_SIZE) {
      await this.recordCurrentViewportSize(coordinates, sender)
    }

    if (control === recordingControls.GET_CURRENT_URL) {
      await this.recordCurrentUrl(href, sender)
    }

    if (control === recordingControls.GET_SCREENSHOT) {
      await this.recordScreenshot(value, sender)
    }
  }

  async handlePopupMessage(msg) {
    if (!msg.action) {
      return
    }

    if (msg.action === popupActions.START) {
      await this.start()
    }

    if (msg.action === popupActions.STOP) {
      await browser.sendTabMessage({ action: popupActions.STOP })
      await this.stop()
    }

    if (msg.action === popupActions.CLEAN_UP) {
      if (msg.value) {
        await this.stop()
      }
      await this.toggleOverlay()
      await this.cleanUp()
    }

    if (msg.action === popupActions.PAUSE) {
      if (!msg.stop) {
        await browser.sendTabMessage({ action: popupActions.PAUSE })
      }
      await this.pause()
    }

    if (msg.action === popupActions.UN_PAUSE) {
      if (!msg.stop) {
        await browser.sendTabMessage({ action: popupActions.UN_PAUSE })
      }
      await this.unPause()
    }
  }

  async handlePostToolMessage(msg) {
    const tab = await browser.getActiveTab()
    if (!tab?.id || !tab.url) throw new Error('Open the local WebMCP demo page first.')
    const origin = new URL(tab.url).origin
    if (!isLoopbackOrigin(origin)) {
      throw new Error('post_message can be injected only on localhost or 127.0.0.1.')
    }
    const frame = await chrome.webNavigation.getFrame({ tabId: tab.id, frameId: 0 })
    if (!frame?.documentId || new URL(frame.url).origin !== origin) {
      throw new Error('The exact demo document is not available.')
    }
    const target = { tabId: tab.id, frameId: 0, documentId: frame.documentId, origin }
    await browser.injectContentScriptInto(tab.id, frame.documentId)
    const response = await browser.sendTargetMessage(target, { type: msg.type })
    if (!response?.ok) throw new Error(response?.error || 'The WebMCP page bridge failed.')
    return response.value
  }

  async getActiveRuntimeTarget() {
    const tab = await browser.getActiveTab()
    if (!tab?.id || !tab.url) throw new Error('Open an HTTP or HTTPS page first.')
    const origin = new URL(tab.url).origin
    if (!isHttpOrigin(origin)) throw new Error('WebMCP tools require an HTTP or HTTPS page.')
    const frame = await chrome.webNavigation.getFrame({ tabId: tab.id, frameId: 0 })
    if (!frame?.documentId || new URL(frame.url).origin !== origin) {
      throw new Error('The exact page document is not available.')
    }
    return { tabId: tab.id, frameId: 0, documentId: frame.documentId, origin }
  }

  async getCustomDefinitions(origin) {
    const { [CUSTOM_TOOLS_STORAGE_KEY]: toolsByOrigin = {} } =
      await storage.get(CUSTOM_TOOLS_STORAGE_KEY)
    const definitions = toolsByOrigin[origin]
    return Array.isArray(definitions) ? definitions.map(parseToolDefinition) : []
  }

  async handleRuntimeToolMessage(msg) {
    const target = await this.getActiveRuntimeTarget()
    await browser.injectContentScriptInto(target.tabId, target.documentId)
    const definitions =
      msg.type === 'WEBMCP_RUNTIME_ENABLE'
        ? await this.getCustomDefinitions(target.origin)
        : undefined
    const response = await browser.sendTargetMessage(target, { ...msg, definitions })
    if (!response?.ok) throw new Error(response?.error || 'The WebMCP runtime failed.')
    return response.value
  }

  async handleDefinitionMessage(msg, sender) {
    if (
      sender?.frameId !== 0 ||
      !sender.tab?.id ||
      !sender.url ||
      msg.origin !== new URL(sender.url).origin
    ) {
      throw new Error('The WebMCP definition sender is not an exact main-frame document.')
    }
    if (!isHttpOrigin(msg.origin))
      throw new Error('WebMCP definitions require an HTTP or HTTPS origin.')

    const { [CUSTOM_TOOLS_STORAGE_KEY]: stored = {} } = await storage.get(CUSTOM_TOOLS_STORAGE_KEY)
    const toolsByOrigin = { ...stored }
    const current = Array.isArray(toolsByOrigin[msg.origin])
      ? toolsByOrigin[msg.origin].map(parseToolDefinition)
      : []

    if (msg.type === 'WEBMCP_DEFINITION_SAVE') {
      const definition = parseToolDefinition(msg.definition)
      const index = current.findIndex((item) => item.name === definition.name)
      if (index === -1 && current.length >= customToolLimits.definitionsPerOrigin) {
        throw new Error('This origin already has the maximum number of custom tools.')
      }
      if (index === -1) current.push(definition)
      else current[index] = definition
    } else if (msg.type === 'WEBMCP_DEFINITION_REMOVE') {
      const index = current.findIndex((item) => item.name === msg.name)
      if (index === -1) throw new Error(`Custom WebMCP tool not found: ${msg.name}`)
      current.splice(index, 1)
    } else {
      throw new Error('Unknown WebMCP definition request.')
    }

    toolsByOrigin[msg.origin] = current
    await storage.set({ [CUSTOM_TOOLS_STORAGE_KEY]: toolsByOrigin })
    return current
  }

  bridgeStatus() {
    return {
      enabled: this._bridgeEnabled,
      connected: this._bridgeSocket?.readyState === WebSocket.OPEN,
      url: BRIDGE_URL,
    }
  }

  async handleBridgeControlMessage(msg) {
    if (msg.type === 'WEBMCP_BRIDGE_STATUS') return this.bridgeStatus()
    if (msg.type === 'WEBMCP_BRIDGE_CONNECT') {
      this._bridgeEnabled = true
      await storage.set({ [BRIDGE_ENABLED_STORAGE_KEY]: true })
      this.openBridgeConnection()
      return this.bridgeStatus()
    }
    if (msg.type === 'WEBMCP_BRIDGE_DISCONNECT') {
      this._bridgeEnabled = false
      await storage.set({ [BRIDGE_ENABLED_STORAGE_KEY]: false })
      clearTimeout(this._bridgeReconnectTimer)
      this._bridgeReconnectTimer = null
      this._bridgeSocket?.close(1000, 'Bridge disabled.')
      this._bridgeSocket = null
      return this.bridgeStatus()
    }
    throw new Error('Unknown WebMCP bridge request.')
  }

  openBridgeConnection() {
    if (
      !this._bridgeEnabled ||
      this._bridgeSocket?.readyState === WebSocket.OPEN ||
      this._bridgeSocket?.readyState === WebSocket.CONNECTING
    ) {
      return
    }

    const socket = new WebSocket(BRIDGE_URL)
    this._bridgeSocket = socket
    socket.addEventListener('message', (event) =>
      this.handleBridgeSocketMessage(socket, event.data),
    )
    socket.addEventListener('close', () => {
      if (this._bridgeSocket === socket) this._bridgeSocket = null
      if (!this._bridgeEnabled) return
      clearTimeout(this._bridgeReconnectTimer)
      this._bridgeReconnectTimer = setTimeout(
        () => this.openBridgeConnection(),
        BRIDGE_RECONNECT_MS,
      )
    })
  }

  handleBridgeSocketMessage(socket, rawMessage) {
    let message
    try {
      if (typeof rawMessage !== 'string' || rawMessage.length > 64 * 1024) return
      message = JSON.parse(rawMessage)
    } catch {
      return
    }
    if (message?.kind !== 'request' || !Number.isInteger(message.id)) return

    const request = this._queue.then(() => this.handleBridgeMethod(message.method, message.params))
    this._queue = request.catch((error) => console.error(error))
    request.then(
      (value) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ kind: 'response', id: message.id, ok: true, value }))
        }
      },
      (error) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              kind: 'response',
              id: message.id,
              ok: false,
              error: String(error?.message || error).slice(0, 500),
            }),
          )
        }
      },
    )
  }

  async handleBridgeMethod(method, params = {}) {
    if (method === 'runtime_status') {
      return this.handleRuntimeToolMessage({ type: 'WEBMCP_RUNTIME_STATUS' })
    }
    if (method === 'list_tools') {
      await this.handleRuntimeToolMessage({ type: 'WEBMCP_RUNTIME_ENABLE' })
      return this.handleRuntimeToolMessage({ type: 'WEBMCP_RUNTIME_LIST' })
    }
    if (method === 'call_tool') {
      if (typeof params.name !== 'string' || params.name.length > 64) {
        throw new Error('A valid WebMCP tool name is required.')
      }
      if (!params.input || typeof params.input !== 'object' || Array.isArray(params.input)) {
        throw new Error('WebMCP tool input must be an object.')
      }
      await this.handleRuntimeToolMessage({ type: 'WEBMCP_RUNTIME_ENABLE' })
      return this.handleRuntimeToolMessage({
        type: 'WEBMCP_RUNTIME_CALL',
        name: params.name,
        input: params.input,
      })
    }
    throw new Error(`Unknown extension bridge method: ${method}`)
  }

  async handleNavigation() {
    if (!this._isRecording) {
      return
    }

    await browser.injectContentScript()
    await this.toggleOverlay({ open: true, pause: this._isPaused })
  }

  handleBeforeNavigate() {
    if (this._isRecording) {
      badge.wait()
    }
  }

  // TODO: Use a better naming convention for this arguments
  toggleOverlay({ open = false, clear = false, pause = false } = {}) {
    return browser.sendTabMessage({
      action: overlayActions.TOGGLE_OVERLAY,
      value: { open, clear, pause },
    })
  }
}

const background = new Background()
background.init()
