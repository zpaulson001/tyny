import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioPipeline } from '~/lib/audio-pipeline';
import {
  concatenateFloat32Arrays,
  saveFloat32ArrayToWav,
} from '~/lib/audio-utils';
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
  inferenceTime: number;
}

export default function useTranscription(
  deviceId: string,
  options: Partial<TranscriptionOptions> = {}
) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const fullAudioBufferRef = useRef<Float32Array>(new Float32Array(0));
  const onChunkBufferRef = useRef<Float32Array>(new Float32Array(0));
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [streamState, setStreamState] = useState<StreamState>(
    STREAM_STATE.IDLE
  );
  const [transcription, setTranscription] = useState<Transcription[]>([]);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const vadWorkerRef = useRef<Worker | null>(null);
  const audioPipelineRef = useRef<AudioPipeline | null>(null);
  const utteranceSegmenterRef = useRef<UtteranceSegmenter | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sentChunksRef = useRef<Set<number>>(new Set());
  const lastSequenceNumberRef = useRef<number>(0);

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

      // Connect to WebSocket
      wsRef.current = new WebSocket('ws://localhost:3000/ws');

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'transcription') {
          setTranscription((prev) => [
            ...prev,
            {
              id: Date.now(),
              text: data.text,
              inferenceTime: data.inference_time,
            },
          ]);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStreamState(STREAM_STATE.ERROR);
      };

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
          onChunkBufferRef.current = concatenateFloat32Arrays(
            onChunkBufferRef.current,
            chunk
          );
          console.log('Sending chunk to worker');
          const currentSequenceNumber = lastSequenceNumberRef.current;
          sentChunksRef.current.add(currentSequenceNumber);
          vadWorkerRef.current?.postMessage({
            type: 'inference',
            data: chunk,
            sequenceNumber: currentSequenceNumber,
          });
          lastSequenceNumberRef.current++;
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
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
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
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (fullAudioBufferRef.current) {
      saveFloat32ArrayToWav(
        fullAudioBufferRef.current,
        SAMPLE_RATE,
        `full_audio_buffer_ref`
      );
    }

    if (onChunkBufferRef.current) {
      saveFloat32ArrayToWav(
        onChunkBufferRef.current,
        SAMPLE_RATE,
        `on_chunk_buffer_ref`
      );
    }

    audioPipelineRef.current = null;
    fullAudioBufferRef.current = new Float32Array(0);
    setStreamState(STREAM_STATE.IDLE);
    console.log('sentChunksRef', sentChunksRef.current);
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

    if (!utteranceSegmenterRef.current) {
      utteranceSegmenterRef.current = new UtteranceSegmenter(
        mergedOptions.speechProbThreshold,
        mergedOptions.silenceDuration,
        (utterance) => {
          console.log('New utterance detected:', utterance);
          // Send the raw PCM audio data to the WebSocket server
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            // Convert Float32Array to ArrayBuffer for sending
            const buffer = utterance.buffer;
            wsRef.current.send(buffer);
          }
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
          const sequenceNumber = e.data.output.sequenceNumber;
          sentChunksRef.current.delete(sequenceNumber);

          // Handle speech state changes
          if (speechProb >= mergedOptions.speechProbThreshold) {
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
    };

    // Attach the callback function as an event listener.
    vadWorkerRef.current.addEventListener('message', vadOnMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => {
      vadWorkerRef.current?.removeEventListener(
        'message',
        vadOnMessageReceived
      );
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    streamState,
    toggleStreaming,
    isSpeaking,
    transcription,
  };
}
