class AudioPipeline {
  private audioContext: AudioContext | null = null;
  private inputStream: MediaStream;
  private onChunk: ((chunk: Float32Array) => void | Promise<void>) | null =
    null;
  private inputNode: MediaStreamAudioSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private downsamplerNode: AudioWorkletNode | null = null;

  constructor(
    inputStream: MediaStream,
    onChunk?: (chunk: Float32Array) => void | Promise<void>
  ) {
    this.inputStream = inputStream;
    this.onChunk = onChunk || null;
  }

  async start(): Promise<void> {
    this.audioContext = new AudioContext();

    // Load downsampler worklet script
    await this.audioContext.audioWorklet.addModule('/worklets/downsampler.js');

    this.inputNode = this.audioContext.createMediaStreamSource(
      this.inputStream
    );

    this.filterNode = this.audioContext.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 8000;

    this.downsamplerNode = new AudioWorkletNode(
      this.audioContext,
      'downsampler-worklet',
      {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: {
          outputSize: 512,
        },
      }
    );

    if (this.onChunk) {
      this.downsamplerNode.port.onmessage = async (event) => {
        console.log('Received chunk:', event.data);
        if (this.onChunk) {
          try {
            const result = this.onChunk(event.data);
            if (result instanceof Promise) {
              await result;
            }
          } catch (error) {
            console.error('Error in onChunk callback:', error);
          }
        }
      };
    }

    this.inputNode.connect(this.filterNode);
    this.filterNode.connect(this.downsamplerNode);
    this.filterNode.connect(this.audioContext.destination);
  }

  async stop(): Promise<void> {
    if (this.downsamplerNode) {
      this.downsamplerNode.disconnect();
      this.downsamplerNode = null;
    }
    if (this.filterNode) {
      this.filterNode.disconnect();
      this.filterNode = null;
    }
    if (this.inputNode) {
      this.inputNode.disconnect();
      this.inputNode = null;
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export default AudioPipeline;
