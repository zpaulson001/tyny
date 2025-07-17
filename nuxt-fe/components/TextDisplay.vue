<script setup lang="ts">
const { utterances } = storeToRefs(useUtterancesStore());

// Ref for the last utterance div
const scrollRef = ref<HTMLElement | null>(null);

// Helper function to get text items from an utterance
const getUtteranceItems = (utterance: any) => {
  const items: Array<{
    type: 'transcription' | 'translation';
    languageCode?: string;
    text: string;
    isCommitted: boolean;
  }> = [];

  // Add transcription
  const transcriptionText = utterance.transcription.committed || utterance.transcription.volatile;
  if (transcriptionText) {
    items.push({
      type: 'transcription',
      text: transcriptionText,
      isCommitted: !!utterance.transcription.committed
    });
  }

  // Add translations
  Object.entries(utterance.translations).forEach(([languageCode, translation]: [string, any]) => {
    const translationText = translation.committed || translation.volatile;
    if (translationText) {
      items.push({
        type: 'translation',
        languageCode,
        text: translationText,
        isCommitted: !!translation.committed
      });
    }
  });

  return items;
};

// Watch for changes in utterances and scroll to bottom
watch(utterances, (newUtterances, oldUtterances) => {
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollIntoView({ behavior: 'smooth' });
    }
  });
}, { deep: true });
</script>

<template>
  <div class="overflow-y-auto">
    <div class="grid gap-2 text-2xl">
      <div v-for="([utteranceId, utterance], utteranceIndex) of utterances" :key="utteranceId" :class="['flex gap-4']">
        <div v-for="(item, itemIndex) in getUtteranceItems(utterance)" :key="itemIndex" :data-lang="item.languageCode"
          :class="['flex-1', { 'text-gray-500': !item.isCommitted }]">
          {{
            item.text
          }}
        </div>
      </div>
    </div>
    <div ref="scrollRef"></div>
  </div>
</template>
