import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioPipeline } from '~/lib/audio-pipeline';
import {
  concatenateFloat32Arrays,
  saveFloat32ArrayToWav,
} from '~/lib/audio-utils';
import UtteranceSegmenter from '~/lib/utterance-segmenter';
import { LANGUAGES } from '~/components/LanguageSelect';

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
  input: {
    deviceId?: string;
    file?: ArrayBuffer;
  };
  targetLanguage?: (typeof LANGUAGES)[keyof typeof LANGUAGES];
  speechProbThreshold?: number;
  silenceDuration?: number;
}

interface Transcription {
  id: number;
  text: string;
  time: number;
  translation?: string;
}

export default function useLocalTranscription(options: TranscriptionOptions) {
  const fullAudioBufferRef = useRef<Float32Array>(new Float32Array(0));
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const shouldStartNewTranscription = useRef<boolean>(true);
  const [streamState, setStreamState] = useState<StreamState>(
    STREAM_STATE.IDLE
  );
  const [transcription, setTranscription] = useState<Transcription[]>([]);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const vadWorkerRef = useRef<Worker | null>(null);
  const whisperWorkerRef = useRef<Worker | null>(null);
  const translatorWorkerRef = useRef<Worker | null>(null);
  const audioPipelineRef = useRef<AudioPipeline | null>(null);
  const utteranceSegmenterRef = useRef<UtteranceSegmenter | null>(null);
  const {
    input,
    targetLanguage,
    speechProbThreshold = 0.5,
    silenceDuration = 0.7,
  } = options;

  const isLoadingModels = !whisperReady || !translatorReady;

  const removeEventListeners = () => {
    vadWorkerRef.current?.removeEventListener('message', vadOnMessageReceived);
    translatorWorkerRef.current?.removeEventListener(
      'message',
      translatorOnMessageReceived
    );
    whisperWorkerRef.current?.removeEventListener(
      'message',
      whisperOnMessageReceived
    );
  };

  const whisperOnMessageReceived = useCallback(
    (e: MessageEvent) => {
      switch (e.data.status) {
        case 'start':
          shouldStartNewTranscription.current = true;
          break;
        case 'ready':
          console.log('Worker is ready');
          setWhisperReady(true);
          break;
        case 'update':
          console.log('Transcription:', e.data);
          console.log(
            'shouldStartNewTranscription',
            shouldStartNewTranscription.current
          );
          if (shouldStartNewTranscription.current) {
            const newTranscription = {
              id: e.data.id,
              text: e.data.output,
              time: e.data.time,
            };
            shouldStartNewTranscription.current = false;
            setTranscription((prev) => {
              console.log('Setting new transcription', e.data.output);
              return [...prev, newTranscription];
            });
          } else {
            const newTransciptionArray = [...transcription];
            newTransciptionArray[e.data.id].text += e.data.output;
            setTranscription(newTransciptionArray);
          }
          break;
        case 'complete':
          console.log('Final Transcription:', e.data.output);
          if (targetLanguage) {
            console.log('Sending message to translator worker');
            translatorWorkerRef.current?.postMessage({
              type: 'generate',
              data: {
                text: e.data.output,
                targetLanguage,
              },
              id: e.data.id,
            });
          }
          break;
      }
    },
    [targetLanguage, transcription]
  );

  // Create a callback function for messages from the worker thread.
  const vadOnMessageReceived = useCallback((e: MessageEvent) => {
    switch (e.data.status) {
      case 'ready':
        console.log('Worker is ready');
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

  const translatorOnMessageReceived = useCallback(
    (e: MessageEvent) => {
      switch (e.data.status) {
        case 'ready':
          setTranslatorReady(true);
          break;
        case 'update':
          console.log('Translation:', e.data);
          const newTranscription = [...transcription];
          if ('translation' in newTranscription[e.data.id]) {
            newTranscription[e.data.id].translation += e.data.output;
          } else {
            newTranscription[e.data.id].translation = e.data.output;
          }
          setTranscription(newTranscription);
          break;
        case 'complete':
          console.log('Translation:', e.data.output);
          break;
      }
    },
    [transcription]
  );

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

    if (fullAudioBufferRef.current) {
      saveFloat32ArrayToWav(
        fullAudioBufferRef.current,
        SAMPLE_RATE,
        `full_audio_buffer_ref`
      );
    }

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

    if (!translatorWorkerRef.current) {
      console.log('Creating new Translator worker...');
      translatorWorkerRef.current = new Worker(
        new URL('../workers/translator.js', import.meta.url),
        {
          type: 'module',
        }
      );
      translatorWorkerRef.current.postMessage({ type: 'load' });
      console.log('Worker created successfully');
    }

    if (!utteranceSegmenterRef.current) {
      utteranceSegmenterRef.current = new UtteranceSegmenter(
        speechProbThreshold,
        silenceDuration,
        (utterance) => {
          whisperWorkerRef.current?.postMessage({
            type: 'generate',
            data: utterance,
          });
        }
      );
    }

    removeEventListeners();

    // Attach the callback function as an event listener.
    vadWorkerRef.current.addEventListener('message', vadOnMessageReceived);
    translatorWorkerRef.current?.addEventListener(
      'message',
      translatorOnMessageReceived
    );
    whisperWorkerRef.current?.addEventListener(
      'message',
      whisperOnMessageReceived
    );

    // Define a cleanup function for when the component is unmounted.
    return removeEventListeners;
  }, [whisperOnMessageReceived]);

  return {
    streamState,
    toggleStreaming,
    isSpeaking,
    transcription,
    isLoadingModels,
  };
}
