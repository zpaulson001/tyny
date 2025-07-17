import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { AudioPipeline } from '~/utils/audio-pipeline';
import { concatenateFloat32Arrays } from '~/utils/audio-utils';
import UtteranceSegmenter from '~/utils/utterance-segmenter';
import apiFetch from '~/utils/api';

/**
 * Options for configuring the transcription behavior
 */
interface TranscriptionOptions {
  /** Threshold for speech probability (0-1) */
  input:
    | Ref<{
        deviceId?: string;
        file?: File;
      }>
    | {
        deviceId?: string;
        file?: File;
      };
  speechProbThreshold?: number;
  silenceDuration?: number;
  roomId?: Ref<string>;
  onRoomCreated?: (roomId: Ref<string>) => void;
}

export function usePostAudio(options: TranscriptionOptions) {
  // Reactive state that affects the UI
  const isSpeaking = ref<boolean>(false);
  const { streamState } = storeToRefs(useStreamStatus());

  // Internal state that doesn't affect the UI
  let fullAudioBuffer: Float32Array = new Float32Array(0);
  let mediaStream: MediaStream | null = null;
  let vadWorker: Worker | null = null;
  let audioPipeline: AudioPipeline | null = null;
  let utteranceSegmenter: UtteranceSegmenter | null = null;

  const {
    input,
    speechProbThreshold = 0.5,
    silenceDuration = 0.7,
    onRoomCreated,
  } = options;

  const roomId = computed(() => options.roomId?.value || '');

  // Handle both reactive and non-reactive input
  const inputValue = isRef(input) ? input : ref(input);

  const postUrl = computed(() => {
    return `/rooms/${roomId?.value}`;
  });

  const removeEventListeners = () => {
    vadWorker?.removeEventListener('message', vadOnMessageReceived);
  };

  // Create a callback function for messages from the worker thread.
  const vadOnMessageReceived = (e: MessageEvent) => {
    switch (e.data.status) {
      case 'ready':
        break;
      case 'complete':
        const speechProb = e.data.output.speechProb;

        // Handle speech state changes
        if (speechProb >= speechProbThreshold) {
          isSpeaking.value = true;
        } else {
          isSpeaking.value = false;
        }

        // Concatenate the new chunk with the existing buffer
        const newBuffer = concatenateFloat32Arrays(
          fullAudioBuffer,
          e.data.output.audioChunk
        );

        fullAudioBuffer = newBuffer;
        utteranceSegmenter?.process(
          e.data.output.audioChunk,
          e.data.output.speechProb
        );
        break;
    }
  };

  const toggleStreaming = async () => {
    if (streamState.value === 'streaming') {
      stopStreaming();
    } else {
      await startStreaming();
    }
  };

  const startStreaming = async () => {
    try {
      streamState.value = 'connecting';

      onRoomCreated?.(roomId);

      let audioSource: ArrayBuffer | MediaStream;

      if (inputValue.value.file) {
        // Convert file to ArrayBuffer
        audioSource = await inputValue.value.file.arrayBuffer();
      } else {
        // Only include deviceId in constraints if it's not empty
        const constraints: MediaStreamConstraints = {
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            ...(inputValue.value.deviceId
              ? { deviceId: { exact: inputValue.value.deviceId } }
              : {}),
          },
        };

        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        audioSource = mediaStream;
      }

      audioPipeline = new AudioPipeline(audioSource, async (chunk) => {
        vadWorker?.postMessage({
          type: 'inference',
          data: chunk,
        });
      });

      streamState.value = 'startingUp';
      await apiFetch('/wake-up');

      await audioPipeline.start();
      streamState.value = 'streaming';
    } catch (error) {
      console.error('Error starting audio stream:', error);
      streamState.value = 'error';
      // Clean up any partial setup
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
      }
    }
  };

  const stopStreaming = async () => {
    if (audioPipeline) {
      await audioPipeline.stop();
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
    vadWorker?.postMessage({ type: 'reset' });

    fullAudioBuffer = new Float32Array(0);

    isSpeaking.value = false;

    streamState.value = 'idle';
  };

  onMounted(() => {
    if (!vadWorker) {
      vadWorker = new Worker(
        new URL('../assets/workers/silero.js', import.meta.url),
        {
          type: 'module',
        }
      );
    }

    if (!utteranceSegmenter) {
      utteranceSegmenter = new UtteranceSegmenter(
        speechProbThreshold,
        silenceDuration,
        1,
        (utterance) => {
          const int16Array = convertFloat32ArrayToInt16Array(utterance);

          apiFetch(postUrl.value, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
            },
            body: int16Array.buffer,
            query: {
              is_utterance: true,
            },
          });
        },
        (utterance) => {
          const int16Array = convertFloat32ArrayToInt16Array(utterance);

          apiFetch(postUrl.value, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
            },
            body: int16Array.buffer,
          });
        }
      );
    }

    removeEventListeners();

    // Attach the callback function as an event listener.
    vadWorker?.addEventListener('message', vadOnMessageReceived);
  });

  onUnmounted(() => {
    removeEventListeners();
  });

  return {
    streamState,
    toggleStreaming,
    isSpeaking,
    roomId,
  };
}
