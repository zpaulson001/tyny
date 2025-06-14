// export class AudioPipeline {
//   private mediaRecorder: MediaRecorder | null = null;
//   private audioContext: AudioContext | null = null;
//   private inputStream: MediaStream | null = null;
//   private onChunk: ((chunk: Float32Array) => void | Promise<void>) | null =
//     null;
//   constructor(
//     inputStream: MediaStream,
//     onChunk?: (chunk: Float32Array) => void | Promise<void>
//   ) {
//     this.inputStream = inputStream;
//     this.onChunk = onChunk || null;
//   }

//   async start(): Promise<void> {
//     console.log('Starting audio pipeline');
//     if (!this.inputStream) {
//       throw new Error('Input stream is required');
//     }
//     this.audioContext = new AudioContext({
//       sampleRate: 16000,
//     });
//     this.mediaRecorder = new MediaRecorder(this.inputStream);
//     this.mediaRecorder.ondataavailable = (event) => {
//       if (event.data.size > 0 && this.mediaRecorder) {
//         const blob = new Blob([event.data], {
//           type: this.mediaRecorder.mimeType,
//         });
//         const fileReader = new FileReader();
//         fileReader.onloadend = async () => {
//           const arrayBuffer = fileReader.result as ArrayBuffer;
//           const audioBuffer =
//             await this.audioContext?.decodeAudioData(arrayBuffer);
//           const audio = audioBuffer?.getChannelData(0);
//           if (audio) {
//             console.log('Audio in seconds', audio.length / 16000);
//             this.onChunk?.(audio);
//           }
//         };
//         fileReader.readAsArrayBuffer(blob);
//       }
//     };
//   }

//   async stop(): Promise<void> {
//     if (this.mediaRecorder) {
//       this.mediaRecorder.stop();
//       this.mediaRecorder = null;
//     }
//   }
// }

export class AudioPipeline {
  private audioContext: AudioContext | null = null;
  private inputStream: MediaStream;
  private onChunk: ((chunk: Float32Array) => void | Promise<void>) | null =
    null;
  private inputNode: MediaStreamAudioSourceNode | null = null;
  private outletNode: AudioWorkletNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;

  constructor(
    inputStream: MediaStream,
    onChunk?: (chunk: Float32Array) => void | Promise<void>
  ) {
    this.inputStream = inputStream;
    this.onChunk = onChunk || null;
  }

  async start(): Promise<void> {
    this.audioContext = new AudioContext({
      sampleRate: 16000,
    });

    await this.audioContext.audioWorklet.addModule('/worklets/outlet.js');

    this.inputNode = this.audioContext.createMediaStreamSource(
      this.inputStream
    );

    this.destinationNode = this.audioContext.createMediaStreamDestination();

    this.outletNode = new AudioWorkletNode(
      this.audioContext,
      'outlet-worklet',
      {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        processorOptions: {
          outputSize: 512,
        },
      }
    );

    if (this.onChunk) {
      this.outletNode.port.onmessage = async (event) => {
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

    this.inputNode.connect(this.outletNode);
    this.outletNode.connect(this.destinationNode);
  }

  async stop(): Promise<void> {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
    if (this.outletNode) {
      this.outletNode.disconnect();
      this.outletNode = null;
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
