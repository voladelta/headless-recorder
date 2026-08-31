import browser from '../browser'

const activeTab = { id: 1, active: true }

const copyText = {
  data: '',
}

const cookies = [
  {
    name: 'checkly',
  },
]

window.chrome = {
  tabs: {
    create: vi.fn(),
    query: vi.fn(() => Promise.resolve([activeTab])),
    sendMessage: vi.fn(() => Promise.resolve()),
  },
  scripting: {
    insertCSS: vi.fn(() => Promise.resolve()),
    executeScript: vi.fn(() => Promise.resolve()),
  },
  runtime: {
    connect: vi.fn(),
    openOptionsPage: vi.fn(),
  },
  cookies: {
    getAll: vi.fn(() => Promise.resolve(cookies)),
  },
}

Object.defineProperty(global.navigator, 'permissions', {
  configurable: true,
  value: {
    query: vi.fn(() => Promise.resolve({ state: 'granted' })),
  },
})

Object.defineProperty(global.navigator, 'clipboard', {
  configurable: true,
  value: {
    writeText: vi.fn((text) => (copyText.data = text)),
  },
})

beforeEach(() => {
  window?.chrome?.tabs.create.mockClear()
  window?.chrome?.runtime.connect.mockClear()
  window?.chrome?.runtime.openOptionsPage.mockClear()
  window?.chrome?.tabs.query.mockClear()
  window?.chrome?.scripting.insertCSS.mockClear()
  window?.chrome?.scripting.executeScript.mockClear()
})

describe('getActiveTab', () => {
  it('returns the active tab', async () => {
    const tab = await browser.getActiveTab()
    expect(tab).toBe(activeTab)
    expect(window.chrome.tabs.query.mock.calls.length).toBe(1)
  })
})

describe('copyToClipboard', () => {
  it('copies text to clipboard', async () => {
    await browser.copyToClipboard('data')
    expect(window.navigator.clipboard.writeText.mock.calls.length).toBe(1)
  })
})

describe('injectContentScript', () => {
  it('executes content script', async () => {
    await browser.injectContentScript()
    expect(window.chrome.scripting.insertCSS).toHaveBeenCalledWith({
      target: { tabId: activeTab.id },
      files: ['src/content-scripts/index.css'],
    })
    expect(window.chrome.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: activeTab.id },
      files: ['src/content-scripts/index.js'],
    })
  })
})

describe('getChecklyCookie', () => {
  it('returns checkly cookie', async () => {
    await browser.getChecklyCookie()
    expect(window.chrome.cookies.getAll.mock.calls.length).toBe(1)
  })
})

describe('openChecklyRunner', () => {
  it('is not logged in', () => {
    browser.openChecklyRunner({ code: 1, runner: 2, isLoggedIn: false })
    expect(window.chrome.tabs.create.mock.calls.length).toBe(1)
  })

  it('is logged in', () => {
    browser.openChecklyRunner({ code: 1, runner: 2, isLoggedIn: true })
    expect(window.chrome.tabs.create.mock.calls.length).toBe(1)
  })
})

describe('getBackgroundBus', () => {
  it('gets background bus', () => {
    browser.getBackgroundBus()
    expect(window.chrome.runtime.connect).toHaveBeenCalledWith({ name: 'recordControls' })
  })
})

describe('openOptionsPage', () => {
  it('calls function that opens options page', async () => {
    browser.openOptionsPage()
    expect(window.chrome.runtime.openOptionsPage.mock.calls.length).toBe(1)
  })
})

describe('openHelpPage', () => {
  it('calls function that creates new tab and opens help page', async () => {
    browser.openHelpPage()
    expect(window.chrome.tabs.create.mock.calls.length).toBe(1)
  })
})
