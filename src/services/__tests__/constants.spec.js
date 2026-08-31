import { isDarkMode } from '../constants'

function setMatchMediaMock(matches) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn(() => ({ matches })),
  })
}

describe('isDarkMode()', () => {
  beforeEach(() => {
    if (vi.isMockFunction(window.matchMedia)) {
      window.matchMedia.mockClear()
    }
  })

  it('has darkMode enabled', () => {
    setMatchMediaMock(true)
    expect(isDarkMode()).toBe(true)
  })

  it('has darkMode disabled', () => {
    setMatchMediaMock(false)
    expect(isDarkMode()).toBe(false)
  })

  it('does not have matchMedia browser API', () => {
    window.matchMedia = null
    expect(isDarkMode()).toBe(false)
  })
})
