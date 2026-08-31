export default {
  get(keys) {
    if (!chrome.storage || !chrome.storage.local) {
      return Promise.reject('Browser storage not available')
    }

    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (props) => {
        const error = chrome.runtime?.lastError
        if (error) {
          reject(error)
          return
        }

        resolve(props)
      })
    })
  },

  set(props) {
    if (!chrome.storage || !chrome.storage.local) {
      return Promise.reject('Browser storage not available')
    }

    return new Promise((resolve, reject) => {
      chrome.storage.local.set(props, (res) => {
        const error = chrome.runtime?.lastError
        if (error) {
          reject(error)
          return
        }

        resolve(res)
      })
    })
  },

  remove(keys) {
    if (!chrome.storage || !chrome.storage.local) {
      return Promise.reject('Browser storage not available')
    }

    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(keys, (res) => {
        const error = chrome.runtime?.lastError
        if (error) {
          reject(error)
          return
        }

        resolve(res)
      })
    })
  },
}
