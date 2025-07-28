const CONNECTION_STATE = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
} as const;

type ConnectionState = (typeof CONNECTION_STATE)[keyof typeof CONNECTION_STATE];

interface TTEventsOptions {
  targetLanguages?: Ref<string[]>;
}

export function useTTEvents(options: TTEventsOptions = {}) {
  const { targetLanguages } = options;
  const config = useRuntimeConfig();

  const connectionState = ref<ConnectionState>(CONNECTION_STATE.DISCONNECTED);
  const { putTranscription, putTranslation, clearUtterances } =
    useUtterancesStore();
  const { utterances } = storeToRefs(useUtterancesStore());
  let eventSource: EventSource | null = null;

  const toggleConnection = (roomId: Ref<string> | string) => {
    if (eventSource?.OPEN) {
      disconnect();
      return;
    }

    connect(roomId);
  };

  const connect = (roomId: string | Ref<string>) => {
    const roomIdRef = isRef(roomId) ? roomId : ref(roomId);
    connectionState.value = CONNECTION_STATE.CONNECTING;

    const languageQueryString = targetLanguages?.value
      ? targetLanguages.value
          .map((language: string) => `target_lang=${language}`)
          .join('&')
      : '';

    try {
      eventSource = new EventSource(
        `${config.public.apiBaseUrl}/rooms/${roomIdRef.value}/events?${languageQueryString}`
      );

      eventSource?.addEventListener('open', (event) => {
        connectionState.value = CONNECTION_STATE.CONNECTED;
      });

      eventSource?.addEventListener('error', (event) => {
        console.error('Error starting subscription:', event);
        connectionState.value = CONNECTION_STATE.ERROR;
      });

      eventSource?.addEventListener('translation', (event: MessageEvent) => {
        const translation = JSON.parse(event.data);
        putTranslation(translation.utterance_id, translation.language_code, {
          committed: translation.committed,
          volatile: translation.volatile,
        });
      });
      eventSource?.addEventListener('transcription', (event: MessageEvent) => {
        const transcription = JSON.parse(event.data);
        putTranscription(transcription.utterance_id, {
          committed: transcription.committed,
          volatile: transcription.volatile,
        });
      });

      eventSource?.addEventListener('error', (event: MessageEvent) => {
        console.error('Error starting subscription:', event);
        connectionState.value = CONNECTION_STATE.ERROR;
      });
    } catch (error) {
      console.error('Error starting subscription:', error);
      connectionState.value = CONNECTION_STATE.ERROR;
    }
  };

  const disconnect = () => {
    eventSource?.close();
    eventSource = null;
    connectionState.value = CONNECTION_STATE.DISCONNECTED;
  };

  return {
    connectionState: readonly(connectionState),
    toggleConnection,
    utterances,
    clearUtterances,
  };
}
