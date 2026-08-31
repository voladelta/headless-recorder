import { mount } from '@vue/test-utils'
import App from '../OptionsApp.vue'

function createChromeLocalStorageMock(options) {
  let ops = { options: options || {} }
  return {
    storage: {
      local: {
        get: (key, cb) => {
          return cb(ops)
        },
        set: (options, cb) => {
          ops = options
          cb()
        },
      },
      onChanged: {
        addListener: vi.fn(),
      },
    },
  }
}

describe('App.vue', () => {
  beforeEach(() => {
    window.chrome = null
  })

  test('it has the correct pristine / empty state', () => {
    window.chrome = createChromeLocalStorageMock()
    const wrapper = mount(App)

    expect(wrapper.get('h1').text()).toBe('Headless Recorder')
    expect(wrapper.findAll('[role="switch"]')).toHaveLength(3)
  })

  test('it loads the default options', () => {
    window.chrome = createChromeLocalStorageMock()
    const wrapper = mount(App)
    expect(wrapper.vm.$data.options.code.blankLinesBetweenBlocks).toBe(true)
  })

  test('it has the default key code for capturing inputs as 9 (Tab)', () => {
    window.chrome = createChromeLocalStorageMock()
    const wrapper = mount(App)
    expect(wrapper.vm.$data.options.code.keyCode).toBe(9)
  })

  test('it removes options from the old multi-generator output', async () => {
    window.chrome = createChromeLocalStorageMock({
      code: {
        showPlaywrightFirst: false,
        waitForSelectorOnClick: true,
      },
    })
    const wrapper = mount(App)

    await vi.waitFor(() => expect(wrapper.vm.options.code.keyCode).toBe(9))
    expect(wrapper.vm.options.code).toEqual({
      blankLinesBetweenBlocks: true,
      dataAttribute: '',
      keyCode: 9,
    })
  })

  test('clicking the button will listen for the next keydown and update the key code option', () => {
    const options = { code: { keyCode: 9 } }
    window.chrome = createChromeLocalStorageMock(options)
    const wrapper = mount(App)

    return wrapper.vm
      .$nextTick()
      .then(() => {
        wrapper.find('button').element.click()
        const event = new KeyboardEvent('keydown', { keyCode: 16 })
        window.dispatchEvent(event)
        return wrapper.vm.$nextTick()
      })
      .then(() => {
        expect(wrapper.vm.$data.options.code.keyCode).toBe(16)
      })
  })

  test("it stores and loads the user's edited options", async () => {
    const options = { code: { blankLinesBetweenBlocks: false } }
    window.chrome = createChromeLocalStorageMock(options)
    const wrapper = mount(App)

    await vi.waitFor(() => expect(wrapper.vm.options.code.blankLinesBetweenBlocks).toBe(false))

    await wrapper.findAll('[role="switch"]')[0].trigger('click')
    expect(wrapper.find('[role="alert"]').text()).toEqual('Saving...')
    await vi.waitFor(() => expect(wrapper.vm.options.code.blankLinesBetweenBlocks).toBe(true))

    await wrapper.vm.load()
    expect(wrapper.vm.options.code.blankLinesBetweenBlocks).toBe(true)
  })
})
