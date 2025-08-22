export class AudioPipeline {
  private audioContext: AudioContext | null = null;
  private inputSource: MediaStream | ArrayBuffer;
  private onChunk: ((chunk: Float32Array) => void | Promise<void>) | null =
    null;
  private inputNode: MediaStreamAudioSourceNode | AudioBufferSourceNode | null =
    null;
  private outletNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private filterNode: BiquadFilterNode | null = null;

  constructor(
    inputSource: MediaStream | ArrayBuffer,
    onChunk?: (chunk: Float32Array) => void | Promise<void>
  ) {
    this.inputSource = inputSource;
    this.onChunk = onChunk || null;
  }

  async start(): Promise<void> {
    const isMicInput = this.inputSource instanceof MediaStream;
    const audioContextOptions = isMicInput ? undefined : { sampleRate: 16000 };

    this.audioContext = new AudioContext(audioContextOptions);

    await this.audioContext.audioWorklet.addModule('/worklets/outlet.js');

    this.inputNode = await this.createInputNode(isMicInput ? 'mic' : 'file');

    this.destinationNode = this.audioContext.createMediaStreamDestination();
    this.compressorNode = this.createCompressorNode();
    this.gainNode = this.createGainNode();
    this.outletNode = this.createOutletNode(isMicInput);

    if (this.onChunk) {
      this.outletNode.port.onmessage = async (event) => {
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

    if (isMicInput) {
      this.filterNode = this.createFilterNode();
      this.inputNode.connect(this.compressorNode);
      this.compressorNode.connect(this.filterNode);
      this.filterNode.connect(this.outletNode);
      this.gainNode.connect(this.outletNode);
      this.outletNode.connect(this.destinationNode);
    } else {
      this.inputNode.connect(this.outletNode);
      this.outletNode.connect(this.destinationNode);
    }

    if (this.inputNode instanceof AudioBufferSourceNode) {
      this.inputNode.start();
    }
  }

  private async createInputNode(
    sourceType: 'mic' | 'file'
  ): Promise<MediaStreamAudioSourceNode | AudioBufferSourceNode> {
    if (this.audioContext) {
      if (sourceType === 'mic') {
        return this.audioContext.createMediaStreamSource(
          this.inputSource as MediaStream
        );
      }
      const audioBuffer = await this.audioContext.decodeAudioData(
        this.inputSource as ArrayBuffer
      );
      this.inputNode = this.audioContext.createBufferSource();
      this.inputNode.buffer = audioBuffer;
      return this.inputNode;
    }
    throw new Error('Audio context is not initialized');
  }

  private createOutletNode(
    downsample: boolean = false,
    downsampleFactor?: number
  ): AudioWorkletNode {
    if (this.audioContext) {
      return new AudioWorkletNode(this.audioContext, 'outlet-worklet', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        processorOptions: {
          outputSize: 512,
          downsample,
          downsampleFactor,
        },
      });
    }
    throw new Error('Audio context is not initialized');
  }

  private createCompressorNode(): DynamicsCompressorNode {
    if (this.audioContext) {
      const compressorNode = this.audioContext.createDynamicsCompressor();
      compressorNode.threshold.value = -20; // Start compressing at -20 dB
      compressorNode.knee.value = 10; // Soft knee for a smoother transition
      compressorNode.ratio.value = 3; // 3:1 compression ratio
      compressorNode.attack.value = 0.01; // Fast attack (10ms) to catch sudden peaks
      compressorNode.release.value = 0.15; // Relatively fast release (150ms)
      return compressorNode;
    }
    throw new Error('Audio context is not initialized');
  }
  private createFilterNode(): BiquadFilterNode {
    if (this.audioContext) {
      const lowPassFilter = this.audioContext.createBiquadFilter();

      // Set the filter type to lowpass
      lowPassFilter.type = 'lowpass';

      // Set the cutoff frequency. A value like 7500-7800 Hz is a good choice,
      // leaving some headroom below the Nyquist frequency of 8000 Hz.
      const targetNyquistFrequency = 16000 / 2;
      lowPassFilter.frequency.setValueAtTime(
        targetNyquistFrequency * 0.95,
        this.audioContext.currentTime
      );

      // Optionally, you can set the Q-factor to shape the filter's curve.
      // A Q of 1.0 is a good starting point for a clean, non-resonant filter.
      lowPassFilter.Q.setValueAtTime(1.0, this.audioContext.currentTime);
      return lowPassFilter;
    }
    throw new Error('Audio context is not initialized');
  }

  private createGainNode(): GainNode {
    if (this.audioContext) {
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 1.2;
      return gainNode;
    }
    throw new Error('Audio context is not initialized');
  }

  async stop(): Promise<void> {
    if (this.inputNode instanceof AudioBufferSourceNode) {
      this.inputNode.stop();
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    // Reset all node references
    this.inputNode = null;
    this.outletNode = null;
    this.filterNode = null;
    this.compressorNode = null;
    this.gainNode = null;
    this.destinationNode = null;
  }
}
