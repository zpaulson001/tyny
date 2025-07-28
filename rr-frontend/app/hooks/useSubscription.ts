import { useState, useRef, useCallback } from 'react';
import { useUtteranceActions, useUtterances } from '~/stores/utterance';

const SUBSCRIPTION_STATE = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
} as const;

type SubscriptionState =
  (typeof SUBSCRIPTION_STATE)[keyof typeof SUBSCRIPTION_STATE];

/**
 * Options for configuring the transcription behavior
 */
interface SubscriptionOptions {
  targetLanguages?: string[];
}

export default function useSubscription({
  targetLanguages,
}: SubscriptionOptions) {
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>(
    SUBSCRIPTION_STATE.DISCONNECTED
  );

  const utterances = useUtterances();
  const { putTranscription, putTranslation, clearUtterances } =
    useUtteranceActions();

  const eventSourceRef = useRef<EventSource | null>(null);

  const toggleSubscribing = async (roomId: string = '') => {
    if (subscriptionState === SUBSCRIPTION_STATE.CONNECTED) {
      stopSubscribing();
    } else {
      await startSubscribing(roomId);
    }
  };

  const startSubscribing = useCallback(
    async (roomId: string) => {
      setSubscriptionState(SUBSCRIPTION_STATE.CONNECTING);

      const languageQueryString = targetLanguages
        ?.map((language) => `target_lang=${language}`)
        .join('&');

      try {
        eventSourceRef.current = new EventSource(
          `${import.meta.env.VITE_SERVER_URL}/rooms/${roomId}/events?${languageQueryString}`
        );

        eventSourceRef.current?.addEventListener('transcription', (event) => {
          const transcription = JSON.parse(event.data);
          putTranscription(transcription.utterance_id, {
            committed: transcription.committed,
            volatile: transcription.volatile,
          });
        });
        eventSourceRef.current?.addEventListener('translation', (event) => {
          const translation = JSON.parse(event.data);
          putTranslation(translation.utterance_id, translation.language_code, {
            committed: translation.committed,
            volatile: translation.volatile,
          });
        });

        setSubscriptionState(SUBSCRIPTION_STATE.CONNECTED);
      } catch (error) {
        console.error('Error starting subscription:', error);
        setSubscriptionState(SUBSCRIPTION_STATE.ERROR);
      }
    },
    [targetLanguages]
  );

  const stopSubscribing = async () => {
    eventSourceRef.current?.close();
    setSubscriptionState(SUBSCRIPTION_STATE.DISCONNECTED);
  };

  return {
    subscriptionState,
    toggleSubscribing,
    utterances,
    clearUtterances,
  };
}
