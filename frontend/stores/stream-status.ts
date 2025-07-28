type StreamState = 'idle' | 'connecting' | 'streaming' | 'error' | 'startingUp';

export const useStreamStatus = defineStore('streamStatus', () => {
  const streamState = ref<StreamState>('idle');

  return {
    streamState,
  };
});
