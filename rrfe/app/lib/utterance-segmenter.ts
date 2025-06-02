const SAMPLE_RATE = 16000;

export default class UtteranceSegmenter {
  private audioBuffer: Float32Array = new Float32Array(0);
  private containsSpeech: boolean = false;
  private speechProbThreshold: number;
  private silenceDuration: number;
  private onNewUtterance: (utterance: Float32Array) => void;

  constructor(
    speechProbThreshold: number = 0.8,
    silenceDuration: number = 0.7,
    onNewUtterance: (utterance: Float32Array) => void
  ) {
    this.speechProbThreshold = speechProbThreshold;
    this.silenceDuration = silenceDuration;
    this.onNewUtterance = onNewUtterance;
  }

  private reset() {
    this.audioBuffer = new Float32Array(0);
    this.containsSpeech = false;
  }

  process(audioChunk: Float32Array, speechProb: number) {
    // Create a new buffer with space for existing data plus new chunk
    const newBuffer = new Float32Array(
      this.audioBuffer.length + audioChunk.length
    );
    // Copy existing data
    newBuffer.set(this.audioBuffer);
    // Append new chunk
    newBuffer.set(audioChunk, this.audioBuffer.length);
    this.audioBuffer = newBuffer;

    if (speechProb >= this.speechProbThreshold) {
      this.containsSpeech = true;
    }

    if (this.audioBuffer.length > SAMPLE_RATE * this.silenceDuration) {
      console.log('Audio buffer length:', this.audioBuffer.length);
      if (this.containsSpeech) {
        console.log('New utterance detected');
        this.onNewUtterance(this.audioBuffer);
      }
      this.reset();
    }
  }
}
