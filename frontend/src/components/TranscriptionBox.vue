<script setup lang="ts">
import useTranscriptionStore from '@/stores/transcriptionStore';

const transcriptionStore = useTranscriptionStore();
</script>

<template>
  <div>
    <span>{{ transcriptionStore.committed }}</span>
    <span class="uncommitted">{{ transcriptionStore.uncommitted }}</span>
  </div>
</template>

<style scoped>
.uncommitted {
  color: #969696;
}
</style>
