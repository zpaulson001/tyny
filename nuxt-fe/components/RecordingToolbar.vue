<script setup lang="ts">
const { public: { apiBaseUrl, frontendBaseUrl } } = useRuntimeConfig()

const { data: languages } = await useFetch(`${apiBaseUrl}/languages`)
const { data: roomData, status: roomStatus, error: roomError, refresh } = useFetch<{ roomId: string }>(`${apiBaseUrl}/rooms`, {
  method: 'POST',
});

const roomId = computed(() => roomData.value?.roomId || '');

const roomUrl = computed(() => `${frontendBaseUrl}/rooms/${roomId.value}`);

const { qrSVG } = useQR(roomUrl);

const popRef = ref();


const { clearUtterances } = useUtterancesStore();

const { audioDevices, isLoading, error } = useAudioDevices();

const { mode, selectedDevice, selectedLanguages, selectedFile } = storeToRefs(useToolbarStore());
const { setSelectedFile } = useToolbarStore();

// Create a computed property for the input object to make it reactive
const audioInput = computed(() => ({
  deviceId: selectedDevice.value || undefined,
  file: selectedFile.value || undefined,
}));

const { toggleStreaming, streamState, isSpeaking } = usePostAudio({
  input: audioInput,
  roomId
});

const { toggleConnection } = useTTEvents({
  targetLanguages: selectedLanguages,
});

const inputsDisabled = computed(() => {
  return streamState.value === 'streaming' || streamState.value === 'startingUp' || streamState.value === 'connecting';
});

const fileupload = ref<any>(null);

const handleFileSelect = (event: any) => {
  const files = event.files;
  if (files && files.length > 0) {
    setSelectedFile(files[0]);
  }
};

const handleNewRoom = () => {
  clearUtterances();
  refresh();
};

const handleShareClick = (event: Event) => {
  if (popRef.value) {
    popRef.value.toggle(event);
  }
};

const handleButtonClick = async () => {
  toggleConnection(roomId);
  await toggleStreaming();
};

const handleCopyClick = async () => {
  try {
    await navigator.clipboard.writeText(roomUrl.value);
    // Optionally, show a toast or notification here
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
  }
};
</script>

<template>
  <Toolbar>
    <template #center>
      <div class="flex items-center gap-4">
        <Button icon="pi pi-share-alt" variant="text" aria-label="Share" :disabled="!roomId"
          @click="handleShareClick" />
        <Popover ref="popRef" :show-close-icon="false">
          <div class="flex flex-col items-center gap-4 m-2">
            <div v-html="qrSVG" class="w-48 h-48" />
            <p>Room Code: {{ roomId }}</p>
            <InputGroup>
              <InputText :value="roomUrl" readonly />
              <InputGroupAddon>
                <Button icon="pi pi-copy" label="Copy Link" severity="secondary" @click="handleCopyClick" />
              </InputGroupAddon>
            </InputGroup>
          </div>
        </Popover>
        <Button label="New Room" @click="handleNewRoom" severity="secondary" />
        <SelectButton v-model="mode" :options="['File', 'Mic']" :disabled="inputsDisabled" />
        <Select v-if="mode === 'Mic'" v-model="selectedDevice" :options="audioDevices as any" optionLabel="label"
          optionValue="deviceId" placeholder="Select device..." :disabled="inputsDisabled">
          <template #dropdownicon>
            <i class="pi pi-microphone" />
          </template>
        </Select>
        <FileUpload v-else ref="fileupload" mode="basic" accept="audio/*" @select="handleFileSelect"
          :disabled="inputsDisabled" class="p-button-secondary" choose-icon="pi pi-file" />
        <MultiSelect v-model="selectedLanguages" :options="languages as any[]" optionLabel="name" optionValue="code"
          placeholder="Select languages..." :maxSelectedLabels="2" :selection-limit="3" display="chip" filter
          showToggleAll :disabled="inputsDisabled">
          <template #dropdownicon>
            <i class="pi pi-language" />
          </template>
        </MultiSelect>
        <SpeachActivityIcon :speaking="isSpeaking" />
        <Button :icon="streamState === 'streaming' ? 'pi pi-stop' : mode === 'Mic' ? 'pi pi-circle-fill' : 'pi pi-play'"
          :severity="mode === 'Mic' ? 'danger' : undefined" aria-label="Record" @click="handleButtonClick"
          :loading="streamState === 'startingUp' || streamState === 'connecting'" />
      </div>
    </template>
  </Toolbar>
</template>