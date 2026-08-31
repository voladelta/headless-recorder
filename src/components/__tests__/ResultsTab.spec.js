import { mount } from '@vue/test-utils'

import ResultsTab from '../../views/Results.vue'

describe('ResultsTab.vue', () => {
  test('shows its empty state', () => {
    const wrapper = mount(ResultsTab)

    expect(wrapper.text()).toContain('No code yet...')
    expect(wrapper.find('code.javascript').exists()).toBe(false)
  })

  test('highlights generated code', async () => {
    const wrapper = mount(ResultsTab, {
      props: { puppeteer: `await page.click('.class')` },
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('code.javascript').exists()).toBe(true)
    expect(wrapper.find('code.javascript').classes()).toContain('hljs')
  })

  test('renders tabs for Puppeteer and Playwright', async () => {
    const wrapper = mount(ResultsTab)
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('button')).toHaveLength(2)
    expect(wrapper.findAll('button').map((button) => button.text())).toEqual([
      'puppeteer',
      'playwright',
    ])
  })

  test('renders Playwright first when configured', () => {
    const wrapper = mount(ResultsTab, {
      props: {
        options: {
          code: {
            showPlaywrightFirst: true,
          },
        },
      },
    })

    expect(wrapper.find('button').text()).toEqual('playwright')
  })
})
