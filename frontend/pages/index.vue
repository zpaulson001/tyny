<script setup lang="ts">
const { streamState } = storeToRefs(useStreamStatus());

</script>

<template>
  <div class="h-screen w-full">
    <div class="h-full w-full max-w-5xl mx-auto grid grid-rows-[1fr_auto] gap-2 p-4">
      <TextDisplay v-if="streamState === 'streaming'" />
      <div v-else-if="streamState === 'startingUp' || streamState === 'connecting'"
        class="h-full w-full flex items-center justify-center">
        <Message icon="pi pi-spinner pi-spin" severity="info" :closable="false" size="large">
          {{ streamState === 'startingUp' ? 'Starting up transciption service (this may take up to a minute)' :
            'Connecting to transciption service' }}
        </Message>
      </div>
      <div v-else></div>
      <RecordingToolbar />
    </div>
  </div>
</template>