class DownsamplerWorklet extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const samples = input[0];
      const output = outputs[0];

      for (let i = 0; i < samples.length; i++) {
        if (i == 0 || i % 3 === 0) {
          output.push(samples[i]);
        }
      }
    }
    return true;
  }
}
registerProcessor('downsampler-worklet', DownsamplerWorklet);
