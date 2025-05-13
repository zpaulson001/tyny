import { useState } from 'react';

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

class ModernAudioStreamer {
  private _serverUrl: string;
  private isRecording: boolean;
  private audioContext: AudioContext | null;
  private mediaStream: MediaStream | null;
  private workletNode: AudioWorkletNode | null;
  private websocket: WebSocket | null;
  private targetSampleRate: number;

  constructor(serverUrl: string) {
    this._serverUrl = serverUrl;
    this.isRecording = false;
    this.audioContext = null;
    this.mediaStream = null;
    this.workletNode = null;
    this.websocket = null;
    this.targetSampleRate = 16000;
  }

  get isConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN;
  }

  set serverUrl(url: string) {
    this._serverUrl = url;
  }

  private handleWebSocketMessage(event: MessageEvent) {
    try {
      const messageData: TranscriptionResponse = JSON.parse(event.data);
      if (messageData.event === 'transcription') {
        transcriptionStore.committed = messageData.data.committed;
        transcriptionStore.uncommitted = messageData.data.uncommitted;
      } else if (messageData.event === 'translation') {
        translationStore.zh = messageData.data.text;
      }
      console.log(transcriptionStore.committed, transcriptionStore.uncommitted);
      // You can emit these values or handle them as needed
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
    }
  }

  async resampleAndSend(audioData: Float32Array) {
    if (!this.audioContext) return;

    const offlineCtx = new OfflineAudioContext({
      numberOfChannels: 1,
      length: Math.ceil(
        (audioData.length * this.targetSampleRate) /
          this.audioContext.sampleRate
      ),
      sampleRate: this.targetSampleRate,
    });

    const buffer = new AudioBuffer({
      numberOfChannels: 1,
      length: audioData.length,
      sampleRate: this.audioContext.sampleRate,
    });
    buffer.copyToChannel(new Float32Array(audioData), 0);

    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineCtx.destination);
    source.start();

    try {
      const renderedBuffer = await offlineCtx.startRendering();
      const resampled = renderedBuffer.getChannelData(0);

      // Convert to Int16Array
      const pcmData = new Int16Array(resampled.length);
      for (let i = 0; i < resampled.length; i++) {
        pcmData[i] = Math.max(-1, Math.min(1, resampled[i])) * 0x7fff;
      }

      if (this.isRecording && this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send(pcmData.buffer);
      }
    } catch (err) {
      console.error('Resampling error:', err);
      throw err;
    }
  }

  async connect() {
    if (!this.websocket) {
      this.websocket = new WebSocket(this._serverUrl);
      return new Promise((resolve, reject) => {
        if (!this.websocket)
          return reject(new Error('WebSocket not initialized'));

        this.websocket.onopen = () => resolve(true);
        this.websocket.onerror = (error) => reject(error);
        this.websocket.onmessage = this.handleWebSocketMessage.bind(this);
      });
    }
    return Promise.resolve(true);
  }

  async startStreaming() {
    try {
      if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
        await this.connect();
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
          throw new Error('WebSocket not connected');
        }
      }

      this.audioContext = new AudioContext({
        latencyHint: 'interactive',
      });

      await this.audioContext.audioWorklet.addModule('audio-processor.js');

      if (selectedDevice.value) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: selectedDevice.value.deviceId },
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
          },
        });
      } else {
        throw new Error('No audio device selected');
      }

      const source = this.audioContext.createMediaStreamSource(
        this.mediaStream
      );
      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        'audio-processor'
      );

      this.workletNode.port.onmessage = async (event) => {
        const audioData = new Float32Array(event.data);
        await this.resampleAndSend(audioData);
      };

      source.connect(this.workletNode);

      this.isRecording = true;
      return true;
    } catch (err) {
      console.error('Error starting audio stream:', err);
      throw err;
    }
  }

  stopStreaming() {
    this.isRecording = false;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  disconnect() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
}

export default function useAudioStream(
  serverUrl: string = `${import.meta.env.VITE_SERVER_URL}/ws`,
  deviceId: string = ''
) {
  const TARGET_SAMPLE_RATE = 16000;
  let ws: WebSocket | null = null;
  let audioContext: AudioContext | null = null;
  let mediaStream: MediaStream | null = null;
  const [streamState, setStreamState] = useState<StreamState>(
    STREAM_STATE.IDLE
  );

  const toggleStreaming = () => {
    if (streamState === STREAM_STATE.STREAMING) {
      stopStreaming();
    } else {
      startStreaming();
    }
  };

  const startStreaming = async () => {
    // connect websocket
    setStreamState(STREAM_STATE.CONNECTING);
    setTimeout(() => {
      setStreamState(STREAM_STATE.STREAMING);
    }, 3000);

    // try {
    //   ws = new WebSocket(serverUrl);
    //   ws.onopen = () => {
    //     console.log('WebSocket connected');
    //     setStreamState(STREAM_STATE.STREAMING);
    //   };
    //   ws.onerror = (error) => {
    //     console.error('Error connecting to websocket:', error);
    //     setStreamState(STREAM_STATE.IDLE);
    //   };
    //   ws.onmessage = (event) => {
    //     console.log('WebSocket message received:', event);
    //   };
    //   ws.onclose = () => {
    //     console.log('WebSocket closed');
    //     setStreamState(STREAM_STATE.IDLE);
    //   };
    // } catch (error) {
    //   console.error('Error connecting to websocket:', error);
    //   return;
    // }

    // create audio context
    audioContext = new AudioContext({
      latencyHint: 'interactive',
    });

    await audioContext.audioWorklet.addModule('audio-processor.js');

    // create media stream
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: deviceId },
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
      },
    });

    const source = audioContext.createMediaStreamSource(mediaStream);
    const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');

    // create worklet node
    workletNode.port.onmessage = async (event) => {
      const audioData = new Float32Array(event.data);
      await this.resampleAndSend(audioData);
    };

    source.connect(workletNode);

    setStreamState('streaming');
    // start streaming
  };

  const stopStreaming = () => {
    setStreamState(STREAM_STATE.IDLE);
  };

  const resampleAudio = async (
    audioData: Float32Array
  ): Promise<ArrayBuffer> => {
    if (!audioContext) throw new Error('No AudioContext');

    const offlineCtx = new OfflineAudioContext({
      numberOfChannels: 1,
      length: Math.ceil(
        (audioData.length * TARGET_SAMPLE_RATE) / audioContext.sampleRate
      ),
      sampleRate: TARGET_SAMPLE_RATE,
    });

    const buffer = new AudioBuffer({
      numberOfChannels: 1,
      length: audioData.length,
      sampleRate: audioContext.sampleRate,
    });

    buffer.copyToChannel(new Float32Array(audioData), 0);

    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineCtx.destination);
    source.start();

    try {
      const renderedBuffer = await offlineCtx.startRendering();
      const resampled = renderedBuffer.getChannelData(0);

      // Convert to Int16Array
      const pcmData = new Int16Array(resampled.length);
      for (let i = 0; i < resampled.length; i++) {
        pcmData[i] = Math.max(-1, Math.min(1, resampled[i])) * 0x7fff;
      }

      return pcmData.buffer;
    } catch (err) {
      console.error('Resampling error:', err);
      throw err;
    }
  };

  const sendAudio = async (audioData: ArrayBuffer) => {
    if (ws)
      if (this.isRecording && this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send(pcmData.buffer);
      }
  };

  return {
    streamState,
    toggleStreaming,
  };
}
