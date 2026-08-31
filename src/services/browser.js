const CONTENT_SCRIPT_PATH = 'src/content-scripts/index.js'
const CONTENT_SCRIPT_STYLES_PATH = 'src/content-scripts/index.css'
const DOCS_URL = 'https://github.com/voladelta/headless-recorder#readme'

export default {
  getActiveTab() {
    return chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => tab)
  },

  async sendTabMessage({ action, value, clean } = {}) {
    const tab = await this.getActiveTab()
    return chrome.tabs.sendMessage(tab.id, { action, value, clean })
  },

  async injectContentScript() {
    const tab = await this.getActiveTab()
    const target = { tabId: tab.id }

    await chrome.scripting.insertCSS({
      target,
      files: [CONTENT_SCRIPT_STYLES_PATH],
    })

    return chrome.scripting.executeScript({
      target,
      files: [CONTENT_SCRIPT_PATH],
    })
  },

  copyToClipboard(text) {
    return navigator.permissions.query({ name: 'clipboard-write' }).then((result) => {
      if (result.state !== 'granted' && result.state !== 'prompt') {
        return Promise.reject()
      }

      return navigator.clipboard.writeText(text)
    })
  },

  getBackgroundBus() {
    return chrome.runtime.connect({ name: 'recordControls' })
  },

  openOptionsPage() {
    chrome.runtime.openOptionsPage?.()
  },

  openHelpPage() {
    chrome.tabs.create({ url: DOCS_URL })
  },
}
