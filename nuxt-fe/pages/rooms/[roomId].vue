<script setup lang="ts">
const { roomId } = useRoute().params;
const { public: { apiBaseUrl } } = useRuntimeConfig()
const { data: room, status, error } = useFetch(`${apiBaseUrl}/rooms/${roomId}`);
const { streamState } = storeToRefs(useStreamStatus());

</script>

<template>
  <div class="h-screen w-full">
    <div v-if="status === 'error'" class="h-full w-full flex flex-col items-center justify-center gap-4">
      <Message v-if="error?.statusCode === 404" severity="error" :closable="false" size="large">
        The room you are looking for ({{ roomId }}) does not exist.
      </Message>
      <Message v-else severity="error" :closable="false" size="large">
        {{ error?.statusCode }} {{ error?.statusMessage || 'An unknown error occurred' }}
      </Message>
      <Button label="Re-enter room code" @click="navigateTo('/rooms')" />
    </div>
    <div v-else class="h-full w-full max-w-5xl mx-auto grid grid-rows-[1fr_auto] gap-2 p-4">
      <div class="overflow-y-auto">
        <TextDisplay />
      </div>
      <SubscriberToolbar />
    </div>
  </div>
</template>