<template>
  <div class="audio-streamer">
    <Toolbar>
      <template #start>
        <div v-if="isRecording" class="recording-indicator"></div>
        <span>Audio Streaming Demo</span>
      </template>
      <template #end>
        <Select class="selected-device" v-model="selectedDevice" :options="audioDevices" optionLabel="label"
          placeholder="Select Audio Device" :disabled="isRecording">
        </Select>
        <ButtonGroup>
          <Button :icon="isRecording ? 'pi pi-stop' : 'pi pi-microphone'"
            :severity="isRecording ? 'danger' : 'secondary'" @click="toggleRecording" :loading="isLoading"
            variant="outlined" :disabled="!selectedDevice" />
          <Button icon="pi pi-refresh" variant="outlined" severity="secondary" @click="handleReset" />
        </ButtonGroup>
      </template>

    </Toolbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import useTranscriptionStore from '@/stores/transcriptionStore';

type AudioDevice = {
  label: string;
  deviceId: string;
}

const isRecording = ref(false);
const isLoading = ref(false);
const statusMessage = ref('Ready');
const statusSeverity = ref('info');
const transcriptionStore = useTranscriptionStore();
let streamer: ModernAudioStreamer | null = null;

const audioDevices = ref<AudioDevice[]>([]);
const selectedDevice = ref<AudioDevice | null>(null);

import { watch } from 'vue';

watch(audioDevices, (newDevices) => {
  console.log('Audio devices updated:', newDevices);
});

watch(selectedDevice, (newDevice) => {
  console.log('Selected device changed:', newDevice);
});


const handleReset = () => {
  transcriptionStore.committed = '';
  transcriptionStore.uncommitted = '';
  streamer?.disconnect();
  streamer?.connect();
}

const fetchAudioDevices = async (): Promise<AudioDevice[]> => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter(device => device.kind === 'audioinput').map(device => ({ label: device.label, deviceId: device.deviceId }));
}


// Add this interface before the ModernAudioStreamer class
interface TranscriptionResponse {
  committed: string;
  uncommitted: string;
}

class ModernAudioStreamer {
  private serverUrl: string;
  private isRecording: boolean;
  private audioContext: AudioContext | null;
  private mediaStream: MediaStream | null;
  private workletNode: AudioWorkletNode | null;
  private websocket: WebSocket | null;
  private targetSampleRate: number;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
    this.isRecording = false;
    this.audioContext = null;
    this.mediaStream = null;
    this.workletNode = null;
    this.websocket = null;
    this.targetSampleRate = 16000;


  }

  private handleWebSocketMessage(event: MessageEvent) {
    try {
      const messageData: TranscriptionResponse = JSON.parse(event.data);
      console.log('Transcription:', {
        committed: messageData.committed,
        uncommitted: messageData.uncommitted
      });
      transcriptionStore.committed = messageData.committed;
      transcriptionStore.uncommitted = messageData.uncommitted;
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
        (audioData.length * this.targetSampleRate) / this.audioContext.sampleRate
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
      this.websocket = new WebSocket(this.serverUrl);
      return new Promise((resolve, reject) => {
        if (!this.websocket) return reject(new Error('WebSocket not initialized'));

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
        throw new Error('WebSocket not connected');
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

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

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

streamer = new ModernAudioStreamer('ws://localhost:3000/ws');

(async () => {
  try {
    await streamer.connect();
    statusMessage.value = 'Connected';

    // Request microphone permissions on load
    await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
      }
    });

    console.log(await fetchAudioDevices());

    audioDevices.value = await fetchAudioDevices();

    statusMessage.value = 'Ready to record';
  } catch (err) {
    statusMessage.value = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
    statusSeverity.value = 'error';
    console.error(err);
  }
})();

const toggleRecording = async () => {
  try {
    if (!isRecording.value) {
      isLoading.value = true;
      await streamer.startStreaming();
      isRecording.value = true;
      statusMessage.value = 'Recording';
      statusSeverity.value = 'warning';
    } else {
      streamer.stopStreaming();
      isRecording.value = false;
      statusMessage.value = 'Connected';
      statusSeverity.value = 'info';
    }
  } catch (err) {
    statusMessage.value = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
    statusSeverity.value = 'error';
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

onUnmounted(() => {
  if (streamer) {
    streamer.stopStreaming();
    streamer.disconnect();
  }
});
</script>

<style scoped>
.selected-device {
  margin-right: 1rem;
}

.audio-streamer {
  width: 100%;
  max-width: 800px;
  margin: 2rem auto;
}

:deep(.p-toolbar) {
  padding: 1rem;
  border-radius: 6px;
}

:deep(.p-message) {
  margin: 0;
}

.recording-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #ff0000;
  animation: blink 1s infinite;
}

@keyframes blink {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }

  100% {
    opacity: 1;
  }
}
</style>