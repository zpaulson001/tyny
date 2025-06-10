import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioPipeline } from '~/lib/audio-pipeline';
import UtteranceSegmenter from '~/lib/utterance-segmenter';

const SAMPLE_RATE = 16000;

const STREAM_STATE = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  STREAMING: 'streaming',
  ERROR: 'error',
} as const;

type StreamState = (typeof STREAM_STATE)[keyof typeof STREAM_STATE];

/**
 * Options for configuring the transcription behavior
 */
interface TranscriptionOptions {
  /** Threshold for speech probability (0-1) */
  speechProbThreshold?: number;
  silenceDuration?: number;
}

const DEFAULT_OPTIONS: Required<TranscriptionOptions> = {
  speechProbThreshold: 0.5,
  silenceDuration: 0.7,
};

interface Transcription {
  id: number;
  text: string;
  time: number;
}

export default function useTranscription(
  deviceId: string,
  options: Partial<TranscriptionOptions> = {}
) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const fullAudioBufferRef = useRef<Float32Array>(new Float32Array(0));
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [streamState, setStreamState] = useState<StreamState>(
    STREAM_STATE.IDLE
  );
  const [transcription, setTranscription] = useState<Transcription[]>([]);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const vadWorkerRef = useRef<Worker | null>(null);
  const whisperWorkerRef = useRef<Worker | null>(null);
  const audioPipelineRef = useRef<AudioPipeline | null>(null);
  const utteranceSegmenterRef = useRef<UtteranceSegmenter | null>(null);

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

      // Only include deviceId in constraints if it's not empty
      const constraints: MediaStreamConstraints = {
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
      };

      // create media stream
      mediaStreamRef.current =
        await navigator.mediaDevices.getUserMedia(constraints);

      audioPipelineRef.current = new AudioPipeline(
        mediaStreamRef.current,
        async (chunk) => {
          console.log('Sending chunk to worker');
          vadWorkerRef.current?.postMessage({
            type: 'inference',
            data: chunk,
          });
        }
      );

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
  }, [deviceId]);

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
      console.log('Creating new Silero VAD worker...');
      vadWorkerRef.current = new Worker(
        new URL('../workers/silero.js', import.meta.url),
        {
          type: 'module',
        }
      );
      console.log('Worker created successfully');
    }

    if (!whisperWorkerRef.current) {
      console.log('Creating new Whisper worker...');
      whisperWorkerRef.current = new Worker(
        new URL('../workers/whisper.js', import.meta.url),
        {
          type: 'module',
        }
      );
      whisperWorkerRef.current.postMessage({ type: 'load' });
      console.log('Worker created successfully');
    }

    if (!utteranceSegmenterRef.current) {
      utteranceSegmenterRef.current = new UtteranceSegmenter(
        mergedOptions.speechProbThreshold,
        mergedOptions.silenceDuration,
        (utterance) => {
          console.log('New utterance detected:', utterance);
          whisperWorkerRef.current?.postMessage({
            type: 'generate',
            data: utterance,
          });
        }
      );
    }

    // Create a callback function for messages from the worker thread.
    const vadOnMessageReceived = (e: MessageEvent) => {
      console.log('Received message from worker:', e.data);
      switch (e.data.status) {
        case 'ready':
          console.log('Worker is ready');
          break;
        case 'complete':
          console.log('Speech probability:', e.data.output);
          const speechProb = e.data.output.speechProb;

          // Handle speech state changes
          if (speechProb >= mergedOptions.speechProbThreshold) {
            setIsSpeaking(true);
          } else {
            setIsSpeaking(false);
          }

          // Concatenate the new chunk with the existing buffer
          const newBuffer = new Float32Array(
            fullAudioBufferRef.current.length + e.data.output.audioChunk.length
          );
          newBuffer.set(fullAudioBufferRef.current);
          newBuffer.set(
            e.data.output.audioChunk,
            fullAudioBufferRef.current.length
          );
          fullAudioBufferRef.current = newBuffer;
          utteranceSegmenterRef.current?.process(
            e.data.output.audioChunk,
            e.data.output.speechProb
          );
          break;
      }
    };

    const whisperOnMessageReceived = (e: MessageEvent) => {
      console.log('Received message from worker:', e.data);
      switch (e.data.status) {
        case 'ready':
          console.log('Worker is ready');
          break;
        case 'complete':
          console.log('Transcription:', e.data.output);
          setTranscription((prev) => [
            ...prev,
            {
              id: e.data.id,
              text: e.data.output,
              time: e.data.time,
            },
          ]);
          break;
      }
    };
    // Attach the callback function as an event listener.
    vadWorkerRef.current.addEventListener('message', vadOnMessageReceived);
    whisperWorkerRef.current.addEventListener(
      'message',
      whisperOnMessageReceived
    );

    // Define a cleanup function for when the component is unmounted.
    return () => {
      vadWorkerRef.current?.removeEventListener(
        'message',
        vadOnMessageReceived
      );
      whisperWorkerRef.current?.removeEventListener(
        'message',
        whisperOnMessageReceived
      );
    };
  }, []);

  return {
    streamState,
    toggleStreaming,
    isSpeaking,
    transcription,
  };
}
