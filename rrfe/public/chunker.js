class ChunkWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 512;
    this.inputBuffer = new Float32Array(this.bufferSize);
    this.inputBufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const samples = input[0];

      for (let i = 0; i < samples.length; i++) {
        this.inputBuffer[this.inputBufferIndex++] = samples[i];

        if (this.inputBufferIndex >= this.bufferSize) {
          // Send the Float32 buffer
          this.port.postMessage(this.inputBuffer);

          // Reset buffer
          this.inputBuffer = new Float32Array(this.bufferSize);
          this.inputBufferIndex = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('chunker-worklet', ChunkWorklet);
