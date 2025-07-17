<script setup>
defineProps({
  speaking: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" :class="{ 'speaking': speaking, 'silent': !speaking }">
    <path
      d="M8.8 20v-4.1l1.9.2a2.3 2.3 0 0 0 2.164-2.1V8.3A5.37 5.37 0 0 0 2 8.25c0 2.8.656 3.054 1 4.55a5.77 5.77 0 0 1 .029 2.758L2 20" />
    <path d="M19.8 17.8a7.5 7.5 0 0 0 .003-10.603" :class="['sound_wave_2', { 'animated': speaking }]" />
    <path d="M17 15a3.5 3.5 0 0 0-.025-4.975" :class="['sound_wave_1', { 'animated': speaking }]" />
  </svg>
</template>

<style scoped>
.speaking {
  stroke: var(--p-button-text-contrast-color);
}

.silent {
  stroke: var(--p-button-text-secondary-color);
}

.sound_wave_1 {
  opacity: 0;
}

.sound_wave_1.animated {
  animation: speak 1s infinite;
}

.sound_wave_2 {
  opacity: 0;
}

.sound_wave_2.animated {
  animation: speak 1s infinite;
  animation-delay: 0.33s;
}

@keyframes speak {

  0%,
  33% {
    opacity: 0;
  }

  33.1%,
  100% {
    opacity: 1;
  }
}
</style>