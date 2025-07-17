import { concatenateFloat32Arrays } from './audio-utils';

const SAMPLE_RATE = 16000;
const CHUNK_SIZE = 512;

export default class UtteranceSegmenter {
  private audioBuffer: Float32Array = new Float32Array(0);
  private lastSpeechLoc: number = 0;
  private containsSpeech: boolean = false;
  private speechProbThreshold: number;
  private silenceDuration: number;
  private updateInterval: number | null;
  private onNewUtterance: (utterance: Float32Array) => void;
  private onUpdate: (utterance: Float32Array) => void;

  constructor(
    speechProbThreshold: number = 0.8,
    silenceDuration: number = 0.7,
    updateInterval: number | null = null,
    onNewUtterance: (utterance: Float32Array) => void = () => {},
    onUpdate: (utterance: Float32Array) => void = () => {}
  ) {
    this.speechProbThreshold = speechProbThreshold;
    this.silenceDuration = silenceDuration;
    this.updateInterval = updateInterval;
    this.onNewUtterance = onNewUtterance;
    this.onUpdate = onUpdate;
  }

  process(audioChunk: Float32Array, speechProb: number) {
    // Create a new buffer with space for existing data plus new chunk
    const newBuffer = concatenateFloat32Arrays(this.audioBuffer, audioChunk);

    this.audioBuffer = newBuffer;

    if (speechProb >= this.speechProbThreshold) {
      this.containsSpeech = true;
      this.lastSpeechLoc = this.audioBuffer.length;
    }

    if (
      this.audioBuffer.length - this.lastSpeechLoc >=
      SAMPLE_RATE * this.silenceDuration
    ) {
      if (this.containsSpeech) {
        this.onNewUtterance(this.audioBuffer);

        // Keep only the audio data from the last speech location onwards
        this.audioBuffer = this.audioBuffer.slice(this.lastSpeechLoc);
      } else {
        this.audioBuffer = this.audioBuffer.slice(audioChunk.length);
      }
      this.containsSpeech = false;
      this.lastSpeechLoc = 0;
      return;
    }

    if (this.updateInterval) {
      if (
        this.audioBuffer.length % (this.updateInterval * SAMPLE_RATE) <
          CHUNK_SIZE &&
        this.containsSpeech
      ) {
        this.onUpdate(this.audioBuffer);
      }
    }
  }
}
