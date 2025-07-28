import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioPipeline } from '~/lib/audio-pipeline';
import { concatenateFloat32Arrays } from '~/lib/audio-utils';
import UtteranceSegmenter from '~/lib/utterance-segmenter';
import { ApiClient } from '~/lib/api-client';

const STREAM_STATE = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  STREAMING: 'streaming',
  ERROR: 'error',
  WARMING_UP: 'warmingUp',
} as const;

type StreamState = (typeof STREAM_STATE)[keyof typeof STREAM_STATE];

/**
 * Options for configuring the transcription behavior
 */
interface TranscriptionOptions {
  /** Threshold for speech probability (0-1) */
  input: {
    deviceId?: string;
    file?: ArrayBuffer;
  };
  speechProbThreshold?: number;
  silenceDuration?: number;
  onRoomCreated?: (roomId: string) => void;
}

export default function useRemoteTranscription(options: TranscriptionOptions) {
  const fullAudioBufferRef = useRef<Float32Array>(new Float32Array(0));
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [streamState, setStreamState] = useState<StreamState>(
    STREAM_STATE.IDLE
  );

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const vadWorkerRef = useRef<Worker | null>(null);
  const audioPipelineRef = useRef<AudioPipeline | null>(null);
  const utteranceSegmenterRef = useRef<UtteranceSegmenter | null>(null);
  const {
    input,
    speechProbThreshold = 0.5,
    silenceDuration = 0.7,
    onRoomCreated,
  } = options;

  const apiClientRef = useRef<ApiClient | null>(null);

  const removeEventListeners = () => {
    vadWorkerRef.current?.removeEventListener('message', vadOnMessageReceived);
  };

  // Create a callback function for messages from the worker thread.
  const vadOnMessageReceived = useCallback((e: MessageEvent) => {
    switch (e.data.status) {
      case 'ready':
        break;
      case 'complete':
        const speechProb = e.data.output.speechProb;

        // Handle speech state changes
        if (speechProb >= speechProbThreshold) {
          setIsSpeaking(true);
        } else {
          setIsSpeaking(false);
        }

        // Concatenate the new chunk with the existing buffer
        const newBuffer = concatenateFloat32Arrays(
          fullAudioBufferRef.current,
          e.data.output.audioChunk
        );

        fullAudioBufferRef.current = newBuffer;
        utteranceSegmenterRef.current?.process(
          e.data.output.audioChunk,
          e.data.output.speechProb
        );
        break;
    }
  }, []);

  const toggleStreaming = async () => {
    if (streamState === STREAM_STATE.STREAMING) {
      stopStreaming();
    } else {
      await startStreaming();
    }
  };

  const startStreaming = useCallback(async () => {
    try {
      setStreamState(STREAM_STATE.CONNECTING);

      await apiClientRef.current?.createRoom();
      onRoomCreated?.(apiClientRef.current?.roomId || '');

      // Only include deviceId in constraints if it's not empty
      const constraints: MediaStreamConstraints = {
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          ...(input.deviceId ? { deviceId: { exact: input.deviceId } } : {}),
        },
      };

      if (input.deviceId) {
        mediaStreamRef.current =
          await navigator.mediaDevices.getUserMedia(constraints);
      }
      audioPipelineRef.current = new AudioPipeline(
        input.file || mediaStreamRef.current,
        async (chunk) => {
          vadWorkerRef.current?.postMessage({
            type: 'inference',
            data: chunk,
          });
        }
      );

      setStreamState(STREAM_STATE.WARMING_UP);
      await apiClientRef.current?.wakeUp();

      await audioPipelineRef.current.start();
      setStreamState(STREAM_STATE.STREAMING);
    } catch (error) {
      console.error('Error starting audio stream:', error);
      setStreamState(STREAM_STATE.ERROR);
      // Clean up any partial setup
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    }
  }, [input.deviceId, input.file]);

  const stopStreaming = async () => {
    if (audioPipelineRef.current) {
      await audioPipelineRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    vadWorkerRef.current?.postMessage({ type: 'reset' });

    fullAudioBufferRef.current = new Float32Array(0);

    setStreamState(STREAM_STATE.IDLE);
  };

  useEffect(() => {
    if (!vadWorkerRef.current) {
      vadWorkerRef.current = new Worker(
        new URL('../workers/silero.js', import.meta.url),
        {
          type: 'module',
        }
      );
    }

    if (!apiClientRef.current) {
      apiClientRef.current = new ApiClient();
    }

    if (!utteranceSegmenterRef.current) {
      utteranceSegmenterRef.current = new UtteranceSegmenter(
        speechProbThreshold,
        silenceDuration,
        1,
        (utterance) => {
          apiClientRef.current?.postAudio(utterance, true);
        },
        (utterance) => {
          apiClientRef.current?.postAudio(utterance);
        }
      );
    }

    removeEventListeners();

    // Attach the callback function as an event listener.
    vadWorkerRef.current.addEventListener('message', vadOnMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return removeEventListeners;
  }, []);

  return {
    streamState,
    toggleStreaming,
    isSpeaking,
  };
}
