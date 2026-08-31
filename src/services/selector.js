import { finder } from '@medv/finder/finder.js'

function getDataAttributeSelector(element, dataAttribute) {
  const path = []
  let current = element

  while (current) {
    const value = current.getAttribute(dataAttribute)

    if (value) {
      const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      path.unshift(`[${dataAttribute}="${escapedValue}"]`)
    } else if (current.id) {
      path.unshift(`#${CSS.escape(current.id)}`)
    } else {
      path.unshift(current.tagName.toLowerCase())
    }

    if (current === document.body || (current === element && value)) {
      break
    }

    current = current.parentElement
  }

  return path.join(' > ')
}

export default function selector(e, { dataAttribute } = {}) {
  if (dataAttribute) {
    return getDataAttributeSelector(e.target, dataAttribute)
  }

  if (e.target.id) {
    return `#${e.target.id}`
  }

  return finder(e.target, {
    seedMinLength: 5,
    optimizedMinLength: e.target.id ? 2 : 10,
    attr: (name) => name === dataAttribute,
  })
}
