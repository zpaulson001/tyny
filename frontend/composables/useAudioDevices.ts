import { ref, readonly } from 'vue';
import { onMounted, onUnmounted } from 'vue';

export function useAudioDevices() {
  const audioDevices = ref<Array<{ deviceId: string; label: string }>>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const fetchAudioDevices = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      // Request permission to access media devices
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get all audio input devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter((device) => device.kind === 'audioinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`,
        }));

      audioDevices.value = audioInputs;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      error.value =
        err instanceof Error ? err.message : 'Failed to access audio devices';
    } finally {
      isLoading.value = false;
    }
  };

  // Handle device changes
  const handleDeviceChange = () => {
    console.log('Media devices changed, refreshing device list...');
    fetchAudioDevices();
  };

  // Auto-fetch devices when composable is used
  onMounted(() => {
    fetchAudioDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
  });

  // Clean up event listener when component unmounts
  onUnmounted(() => {
    navigator.mediaDevices.removeEventListener(
      'devicechange',
      handleDeviceChange
    );
  });

  return {
    audioDevices: readonly(audioDevices),
    isLoading: readonly(isLoading),
    error: readonly(error),
  };
}
