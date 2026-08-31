import { mount } from '@vue/test-utils'

import Toggle from '../Toggle.vue'

describe('Toggle.vue', () => {
  test('uses its label and current value for the switch semantics', () => {
    const wrapper = mount(Toggle, {
      props: { modelValue: false },
      slots: { default: 'Use dark mode' },
    })

    const toggle = wrapper.get('[role="switch"]')
    expect(toggle.text()).toContain('Use dark mode')
    expect(toggle.attributes('aria-checked')).toBe('false')
  })

  test('emits the next value when clicked', async () => {
    const wrapper = mount(Toggle, {
      props: { modelValue: false },
      slots: { default: 'Use dark mode' },
    })

    await wrapper.get('[role="switch"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
  })
})
