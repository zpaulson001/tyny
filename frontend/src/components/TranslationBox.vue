<script setup lang="ts">
import useTranslationStore from '@/stores/translationStore';

const translationStore = useTranslationStore();
</script>

<template>
  <div>
    <span>{{ translationStore.zh }}</span>
  </div>
</template>