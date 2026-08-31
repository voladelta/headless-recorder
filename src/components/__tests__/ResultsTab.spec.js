import { mount } from '@vue/test-utils'

import ResultsTab from '../../views/Results.vue'

describe('ResultsTab.vue', () => {
  test('shows its empty state', () => {
    const wrapper = mount(ResultsTab)

    expect(wrapper.text()).toContain('No code yet…')
    expect(wrapper.find('code.javascript').exists()).toBe(false)
  })

  test('highlights generated code', async () => {
    const wrapper = mount(ResultsTab, {
      props: { code: `await page.locator('.class').click()` },
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('code.javascript').exists()).toBe(true)
    expect(wrapper.find('code.javascript').classes()).toContain('hljs')
  })
})
