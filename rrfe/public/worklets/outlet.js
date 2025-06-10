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

      console.log('buffer before:', this.buffer);

      // Pass the input to the output
      for (let i = 0; i < samples.length; i++) {
        output[0][i] = samples[i];

        // Only add to buffer if we have space
        if (this.bufferIndex < this.outputSize) {
          this.buffer[this.bufferIndex] = samples[i];
          this.bufferIndex++;
        }
      }

      console.log('Buffer index:', this.bufferIndex);
      console.log('Buffer:', this.buffer);

      // If buffer is full, send it and create a new one
      if (this.bufferIndex >= this.outputSize) {
        console.log('Resetting buffer');
        this.port.postMessage(this.buffer);
        this.buffer = new Float32Array(this.outputSize);
        console.log('New buffer:', this.buffer);
        this.bufferIndex = 0;
      }
    }
    return true;
  }
}
registerProcessor('outlet-worklet', OutletWorklet);
