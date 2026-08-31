import Shooter from '@/modules/shooter'

const store = { state: { dataAttribute: '' } }

it('registers mouse events', () => {
  vi.useFakeTimers()
  document.body.innerHTML =
    '<div><div id="username">UserName</div><button id="button"></button></div>'

  const shooter = new Shooter({ store })
  const handleClick = vi.fn()

  shooter.on('click', handleClick)
  shooter.startScreenshotMode()
  document.querySelector('#username').click()
  vi.runAllTimers()

  expect(handleClick).toHaveBeenCalledOnce()
  vi.useRealTimers()
})

it('shows and hides the screenshot overlay', () => {
  const shooter = new Shooter({ store, isClipped: true })

  shooter.startScreenshotMode()
  expect(document.querySelector('#headless-recorder-shooter')).not.toBeNull()
  expect(document.querySelector('#headless-recorder-shooter-outline')).not.toBeNull()

  shooter.stopScreenshotMode()
  expect(document.querySelector('#headless-recorder-shooter')).toBeNull()
  expect(document.querySelector('#headless-recorder-shooter-outline')).toBeNull()
})
