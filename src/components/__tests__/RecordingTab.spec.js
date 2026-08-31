import { mount } from '@vue/test-utils'
import RecordingTab from '../../views/Recording.vue'

describe('RecordingTab.vue', () => {
  test('shows the current recording state', () => {
    const wrapper = mount(RecordingTab, {
      props: {
        isRecording: true,
        isPaused: true,
      },
    })

    expect(wrapper.text()).toContain('RESUME')
    expect(wrapper.get('button[aria-label="Resume recording"]').exists()).toBe(true)
    expect(wrapper.findAll('img')[0].attributes('style')).toBeUndefined()
    expect(wrapper.findAll('img')[1].attributes('style')).toContain('display: none')
    expect(
      wrapper.findAll('img').every((image) => image.attributes('aria-hidden') === 'true'),
    ).toBe(true)
  })

  test('emits recording controls', async () => {
    const wrapper = mount(RecordingTab)
    const [stop, pause, restart] = wrapper.findAll('button')

    await stop.trigger('click')
    await pause.trigger('click')
    await restart.trigger('click')

    expect(wrapper.emitted('stop')).toHaveLength(1)
    expect(wrapper.emitted('pause')).toHaveLength(1)
    expect(wrapper.emitted('restart')).toHaveLength(1)
  })
})
