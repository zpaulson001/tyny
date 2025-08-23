class OutletWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.outputSize = options.processorOptions?.outputSize || 128; // Use the option if provided, otherwise default to 128
    this.downsampleFactor = options.processorOptions?.downsampleFactor || 3;
    this.downsample = options.processorOptions?.downsample || false;
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
      }

      const newSamples = this.downsample
        ? this.downsampleAudio(samples, this.downsampleFactor)
        : samples;

      if (this.bufferIndex + newSamples.length > this.outputSize) {
        this.buffer = this.concatenateFloat32Arrays([
          this.buffer.slice(0, this.bufferIndex),
          newSamples,
        ]);
        this.bufferIndex = this.buffer.length;
      } else {
        this.buffer.set(newSamples, this.bufferIndex);
        this.bufferIndex += newSamples.length;
      }

      // If buffer is full, send it and create a new one with remaining elements
      if (this.bufferIndex >= this.outputSize) {
        // Send only the first outputSize elements
        this.port.postMessage(this.buffer.slice(0, this.outputSize));
        // Create a new buffer with any remaining elements
        const remainingElements = this.bufferIndex - this.outputSize;
        if (remainingElements > 0) {
          const newBuffer = new Float32Array(this.outputSize);
          // Copy remaining elements to the beginning of a new buffer
          newBuffer.set(this.buffer.slice(this.outputSize), 0);
          this.buffer = newBuffer;
          this.bufferIndex = remainingElements;
        } else {
          // No remaining elements, create empty buffer
          this.buffer = new Float32Array(this.outputSize);
          this.bufferIndex = 0;
        }
      }
    }
    return true;
  }

  downsampleAudio(input, downsampleFactor) {
    const output = new Float32Array(input.length / downsampleFactor);
    for (let i = 0, j = 0; i < input.length; i += downsampleFactor, j++) {
      output[j] = input[i];
    }
    return output;
  }

  concatenateFloat32Arrays(arrays) {
    // Calculate total length
    const totalLength = arrays.reduce((sum, array) => sum + array.length, 0);

    // Create result array
    const result = new Float32Array(totalLength);

    // Copy each array into the result
    let offset = 0;
    for (const array of arrays) {
      result.set(array, offset);
      offset += array.length;
    }

    return result;
  }
}
registerProcessor('outlet-worklet', OutletWorklet);
