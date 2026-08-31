import { shallowMount } from '@vue/test-utils'
import App from '../PopupApp.vue'

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
  test('it has the correct pristine / empty state', () => {
    window.chrome = chrome
    const wrapper = shallowMount(App)

    expect(wrapper.find('header-stub').exists()).toBe(true)
    expect(wrapper.find('home-stub').exists()).toBe(true)
    expect(wrapper.find('footer-stub').exists()).toBe(true)
  })
})
