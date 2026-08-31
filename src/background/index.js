import badge from '@/services/badge'
import browser from '@/services/browser'
import storage from '@/services/storage'
import { popupActions, recordingControls } from '@/services/constants'
import { overlayActions } from '@/modules/overlay/constants'
import { headlessActions } from '@/modules/code-generator/constants'

import CodeGenerator from '@/modules/code-generator'

class Background {
  constructor() {
    this._recording = []
    this._badgeState = ''
    this._isRecording = false
    this._isPaused = false
    this._hasGoto = false
    this._hasViewPort = false
    this._queue = Promise.resolve()
  }

  init() {
    chrome.runtime.onConnect.addListener((port) => {
      port.onMessage.addListener((msg) => {
        this.enqueue(() => this.handlePopupMessage(msg))
      })
    })

    chrome.runtime.onMessage.addListener((msg, sender) => {
      this.enqueue(() => this.handleMessage(msg, sender))
    })

    chrome.webNavigation.onCompleted.addListener((details) => {
      this.enqueue(() => this.handleNavigation(details))
    })

    chrome.webNavigation.onBeforeNavigate.addListener(() => {
      this.enqueue(() => this.handleBeforeNavigate())
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

  recordNavigation(sender) {
    return this.recordEvent(
      {
        selector: undefined,
        value: undefined,
        action: headlessActions.NAVIGATION,
      },
      sender,
    )
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
      const { options = {} } = await storage.get('options')
      const generator = new CodeGenerator(options)
      const code = generator.generate(this._recording)

      await browser.sendTabMessage({
        action: 'CODE',
        value: options?.code?.showPlaywrightFirst ? code.playwright : code.puppeteer,
      })
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

  async handleNavigation({ frameId, url }) {
    if (!this._isRecording) {
      return
    }

    await browser.injectContentScript()
    await this.toggleOverlay({ open: true, pause: this._isPaused })

    if (frameId === 0) {
      await this.recordNavigation({ frameId, url })
    }
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
