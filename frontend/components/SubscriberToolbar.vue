<script setup lang="ts">
const { roomId } = useRoute().params;
const { public: { apiBaseUrl } } = useRuntimeConfig()

const { data: languages } = await useFetch(`${apiBaseUrl}/languages`)


const { mode, selectedLanguages, } = storeToRefs(useToolbarStore());

const { toggleConnection, connectionState } = useTTEvents({
  targetLanguages: selectedLanguages,
});

const inputsDisabled = computed(() => {
  return connectionState.value === 'connected' || connectionState.value === 'connecting';
});


</script>

<template>
  <Toolbar>
    <template #center>
      <div class="flex items-center gap-4">
        <MultiSelect v-model="selectedLanguages" :options="languages as any[]" optionLabel="name" optionValue="code"
          placeholder="Select languages..." :maxSelectedLabels="2" :selection-limit="3" display="chip" filter
          showToggleAll :disabled="inputsDisabled">
          <template #dropdownicon>
            <i class="pi pi-language" />
          </template>
        </MultiSelect>
        <Button :icon="connectionState === 'connected' ? 'pi pi-stop' : 'pi pi-play'"
          :label="connectionState === 'connected' ? 'Stop' : 'Start'" :loading="connectionState === 'connecting'"
          @click="() => toggleConnection(roomId as string)" />
      </div>
    </template>
  </Toolbar>
</template>