<template>
  <div class="home">
    <h2 class="home__title">No recorded events yet</h2>
    <p class="home__description">Select Record to start recording browser events.</p>
    <RoundButton :small="false" @click="$emit('start')" class="home__record-button">
      <span class="sr-only">Start recording</span>
      <div class="home__record-icon" aria-hidden="true"></div>
    </RoundButton>
  </div>
</template>

<script>
import RoundButton from '@/components/RoundButton.vue'

export default {
  components: { RoundButton },
}
</script>

<style scoped>
.home {
  display: flex;
  height: 27rem;
  flex-direction: column;
  align-items: center;
  border-radius: var(--radius-md);
  padding-top: 2.5rem;
}

.home__title {
  margin-bottom: 0.75rem;
  color: var(--color-text-primary);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.75rem;
}

.home__description {
  width: 11rem;
  margin-bottom: 1.25rem;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  line-height: 1rem;
  text-align: center;
}

.home__record-button {
  margin-top: 3rem;
  padding: 2.5rem;
}

.home__record-icon {
  width: 5.375rem;
  height: 5.375rem;
  border-radius: 2147483647px;
  background: var(--color-red);
}
</style>
