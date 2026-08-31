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
    expect(wrapper.find('img[alt="resume recording"]').attributes('style')).toBeUndefined()
    expect(wrapper.find('img[alt="pause recording"]').attributes('style')).toContain(
      'display: none',
    )
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
