import { useState, useRef, useEffect, useCallback } from 'react';
import AudioPipeline from '~/lib/audio-pipeline';
import VAD from '~/lib/vad';

// Add this interface before the ModernAudioStreamer class
interface TranscriptionResponse {
  event: string;
  data: any;
}

const STREAM_STATE = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  STREAMING: 'streaming',
  ERROR: 'error',
} as const;

type StreamState = (typeof STREAM_STATE)[keyof typeof STREAM_STATE];

export default function useAudioStream(
  serverUrl: string = `${import.meta.env.VITE_SERVER_URL}/ws`,
  deviceId: string = ''
) {
  const [streamState, setStreamState] = useState<StreamState>(
    STREAM_STATE.IDLE
  );
  const [speechProb, setSpeechProb] = useState<number>(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const vadRef = useRef<VAD | null>(null);

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

      // Ensure VAD is initialized
      if (!vadRef.current) {
        vadRef.current = await VAD.create();
      }

      // Only include deviceId in constraints if it's not empty
      const constraints: MediaStreamConstraints = {
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
      };

      // create media stream
      mediaStreamRef.current =
        await navigator.mediaDevices.getUserMedia(constraints);

      const audioPipeline = new AudioPipeline(
        mediaStreamRef.current,
        async (chunk) => {
          try {
            if (!vadRef.current) {
              console.error('VAD not initialized');
              return;
            }
            const speechProb = await vadRef.current.process(chunk);
            setSpeechProb(speechProb);
          } catch (error) {
            console.error('Error processing audio chunk:', error);
            // Don't throw here, just log the error to prevent pipeline disruption
          }
        }
      );

      await audioPipeline.start();
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

  const stopStreaming = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setStreamState(STREAM_STATE.IDLE);
  };

  useEffect(() => {
    console.log('creating session');
    const loadVAD = async () => {
      vadRef.current = await VAD.create();
    };
    loadVAD();

    return () => {
      if (vadRef.current) {
        console.log('Disposing ONNX session...');
        vadRef.current
          .release()
          .then(() => {
            console.log('ONNX session disposed.');
            vadRef.current = null; // Clear the ref
          })
          .catch((error: Error) => {
            console.error('Error disposing ONNX session:', error);
          });
      }
    };
  }, []);

  return {
    streamState,
    toggleStreaming,
    speechProb,
  };
}
