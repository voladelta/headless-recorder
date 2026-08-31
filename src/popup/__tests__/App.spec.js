import { shallowMount } from '@vue/test-utils'
import App from '../PopupApp.vue'
import browser from '../../services/browser'

const chrome = {
  storage: {
    local: {
      get: vi.fn((keys, callback) => callback({})),
    },
  },
  runtime: {
    connect: vi.fn(() => ({ postMessage: vi.fn() })),
  },
}

describe('App.vue', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('it has the correct pristine / empty state', () => {
    window.chrome = chrome
    const wrapper = shallowMount(App)

    expect(wrapper.find('header-stub').exists()).toBe(true)
    expect(wrapper.find('home-stub').exists()).toBe(true)
    expect(wrapper.find('footer-stub').exists()).toBe(true)
  })

  test('shows copy success only after the clipboard write succeeds', async () => {
    window.chrome = chrome
    vi.spyOn(browser, 'copyToClipboard').mockResolvedValue()
    const wrapper = shallowMount(App)
    wrapper.vm.code = 'await page.click()'

    await wrapper.vm.copyCode()

    expect(wrapper.vm.copyStatus).toBe('success')
    expect(wrapper.vm.copyError).toBe('')
  })

  test('shows a useful error when the clipboard write fails', async () => {
    window.chrome = chrome
    vi.spyOn(browser, 'copyToClipboard').mockRejectedValue(new Error('Clipboard blocked'))
    const wrapper = shallowMount(App)
    wrapper.vm.code = 'await page.click()'

    await wrapper.vm.copyCode()

    expect(wrapper.vm.copyStatus).toBe('error')
    expect(wrapper.vm.copyError).toBe('Unable to copy. Check clipboard permission and try again.')
  })

  test('requires confirmation before it restarts', () => {
    window.chrome = chrome
    const wrapper = shallowMount(App)
    const dialog = wrapper.get('dialog').element
    dialog.showModal = vi.fn()
    dialog.close = vi.fn()
    const restart = vi.spyOn(wrapper.vm, 'restart').mockImplementation(() => {})

    wrapper.vm.requestRestart(true)
    expect(dialog.showModal).toHaveBeenCalledOnce()
    expect(restart).not.toHaveBeenCalled()

    wrapper.vm.confirmRestart()
    expect(dialog.close).toHaveBeenCalledOnce()
    expect(restart).toHaveBeenCalledWith(true)
  })
})
