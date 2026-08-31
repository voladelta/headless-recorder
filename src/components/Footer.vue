<template>
  <div class="footer">
    <span class="footer__version">Version {{ version }}</span>
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

<style scoped>
.footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
}

.footer__version {
  color: var(--color-gray-darkish);
}
</style>
