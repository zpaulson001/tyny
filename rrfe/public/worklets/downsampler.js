class DownsamplerWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.outputSize = options.processorOptions?.outputSize || 128; // Use the option if provided, otherwise default to 128
    this.buffer = new Float32Array(this.outputSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const samples = input[0];
      const output = outputs[0];

      // Downsample the input
      for (let i = 0; i < samples.length; i++) {
        output[0][i] = samples[i];
        if (i == 0 || i % 3 === 0) {
          this.buffer[this.bufferIndex] = samples[i];
          this.bufferIndex++;
        }
      }

      // Only send the buffer when it's completely filled
      if (this.bufferIndex >= this.outputSize) {
        this.port.postMessage(this.buffer);
        this.buffer = new Float32Array(this.outputSize);
        this.bufferIndex = 0;
      }
    }
    return true;
  }
}
registerProcessor('downsampler-worklet', DownsamplerWorklet);
