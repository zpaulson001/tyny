class OutletWorklet extends AudioWorkletProcessor {
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

      // Pass the input to the output
      for (let i = 0; i < samples.length; i++) {
        output[0][i] = samples[i];

        // Only add to buffer if we have space
        if (this.bufferIndex < this.outputSize) {
          this.buffer[this.bufferIndex] = samples[i];
          this.bufferIndex++;
        }
      }

      // If buffer is full, send it and create a new one
      if (this.bufferIndex >= this.outputSize) {
        this.port.postMessage(this.buffer);
        this.buffer = new Float32Array(this.outputSize);
        this.bufferIndex = 0;
      }
    }
    return true;
  }
}
registerProcessor('outlet-worklet', OutletWorklet);
