<template>
  <div class="flex px-4 py-3 justify-end items-center mt-3">
    <span class="text-gray-darkish">Version {{ version }}</span>
  </div>
</template>

<script>
import { ref } from 'vue'
import { version } from '../../package.json'

export default {
  name: 'Footer',

  setup() {
    return {
      version: ref(version),
    }
  },
}
</script>
