export const useToolbarStore = defineStore('toolbar', () => {
  const mode = ref<'File' | 'Mic'>('Mic');
  const selectedDevice = ref<string | null>(null);
  const selectedLanguages = ref<string[]>([]);
  const selectedFile = ref<File | null>(null);
  const roomId = ref<string>('');

  function setMode(newMode: 'File' | 'Mic') {
    mode.value = newMode;
  }

  function setSelectedDevice(newDevice: string) {
    selectedDevice.value = newDevice;
  }

  function setSelectedLanguages(newLanguages: string[]) {
    selectedLanguages.value = newLanguages;
  }

  function setSelectedFile(file: File | null) {
    selectedFile.value = file;
  }

  return {
    mode,
    selectedDevice,
    selectedLanguages,
    selectedFile,
    setMode,
    setSelectedDevice,
    setSelectedLanguages,
    setSelectedFile,
    roomId,
  };
});
