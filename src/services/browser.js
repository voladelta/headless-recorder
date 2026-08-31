const CONTENT_SCRIPT_PATH = 'src/content-scripts/index.js'
const CONTENT_SCRIPT_STYLES_PATH = 'src/content-scripts/index.css'
const RUN_URL = 'https://app.checklyhq.com/checks/new/browser'
const DOCS_URL = 'https://www.checklyhq.com/docs/headless-recorder'
const SIGNUP_URL =
  'https://www.checklyhq.com/product/synthetic-monitoring/?utm_source=Chrome+Extension&utm_medium=Headless+Recorder+Chrome+Extension&utm_campaign=Headless+Recorder&utm_id=Open+Source'

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

      navigator.clipboard.writeText(text)
    })
  },

  async getChecklyCookie() {
    const cookies = await chrome.cookies.getAll({})
    return cookies.find((cookie) => cookie.name.startsWith('checkly_has_account'))
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

  openChecklyRunner({ code, runner, isLoggedIn }) {
    if (!isLoggedIn) {
      chrome.tabs.create({ url: SIGNUP_URL })
      return
    }

    const script = encodeURIComponent(btoa(code))
    const url = `${RUN_URL}?framework=${runner}&script=${script}`
    chrome.tabs.create({ url })
  },
}
