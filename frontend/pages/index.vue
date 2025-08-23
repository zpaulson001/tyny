<script setup lang="ts">
const { streamState } = storeToRefs(useStreamStatus());

const messageVisible = computed(() => {
  return streamState.value === 'startingUp' || streamState.value === 'connecting';
});

</script>

<template>
  <div class="h-screen w-full">
    <div class="h-full w-full max-w-5xl mx-auto grid grid-rows-[1fr_auto] gap-2 p-4">
      <Dialog v-model:visible="messageVisible" modal>
        <template #container>
          <Message icon="pi pi-spinner pi-spin" severity="info" :closable="false" size="large">
            {{ streamState === 'startingUp' ? 'Starting up transciption service (this may take up to a minute)' :
              'Connecting to transciption service' }}
          </Message>
        </template>
      </Dialog>
      <TextDisplay />
      <RecordingToolbar />
    </div>
  </div>
</template>