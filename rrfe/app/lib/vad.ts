import * as ort from 'onnxruntime-web';

function getNewState(): ort.TypedTensor<'float32'> {
  const zeroes = Array(2 * 128).fill(0);
  return new ort.Tensor('float32', zeroes, [2, 1, 128]);
}

ort.env.debug = true;

class VAD {
  constructor(
    private session: ort.InferenceSession,
    private state: ort.TypedTensor<'float32'>,
    private sr: ort.TypedTensor<'int64'>
  ) {}

  static async create(
    path: string = 'models/silero_vad.onnx',
    force_onnx_cpu: boolean = false
  ) {
    console.log(
      `Initializing ONNX session with force_onnx_cpu: ${force_onnx_cpu}`
    );

    // Default execution providers in order of preference
    const defaultProviders = ['webgpu', 'wasm'];

    // Log available execution providers
    console.log('Available execution providers:', ort.env.wasm.numThreads);
    console.log('WebGPU available:', 'gpu' in navigator);

    const options: ort.InferenceSession.SessionOptions = {
      executionProviders: force_onnx_cpu ? ['wasm'] : defaultProviders,
      graphOptimizationLevel: 'all',
      executionMode: 'sequential',
      enableCpuMemArena: true,
      enableMemPattern: true,
      extra: {
        session: {
          intra_op_num_threads: 1,
          inter_op_num_threads: 1,
        },
      },
    };

    try {
      console.log('Creating ONNX session with options:', options);
      const session = await ort.InferenceSession.create(path, options);
      console.log('ONNX session created successfully');

      const stateTensor = getNewState();
      const srTensor = new ort.Tensor('int64', [16000n]);
      console.log('ONNX session created successfully');

      return new VAD(session, stateTensor, srTensor);
    } catch (error) {
      console.error('Failed to create ONNX session:', error);
      throw error;
    }
  }

  reset_state = () => {
    this.state = getNewState();
  };

  async process(audioChunk: Float32Array): Promise<number> {
    console.log(`Processing audio chunk`);
    console.log(audioChunk);

    // Create input tensor with shape [1, N] as expected by the model
    const inputTensor = new ort.Tensor('float32', audioChunk, [
      1, // batch size
      audioChunk.length, // number of samples
    ]);

    const inputs = {
      input: inputTensor,
      state: this.state,
      sr: this.sr,
    };

    try {
      console.log('Running inference with inputs:', {
        inputShape: inputTensor.dims,
        stateShape: this.state.dims,
        srShape: this.sr.dims,
      });

      const outputs = await this.session.run(inputs);
      console.log('Model outputs:', outputs);
      console.log('Input tensor shape:', inputTensor.dims);
      console.log('Input tensor data:', inputTensor.data);
      console.log('State tensor shape:', this.state.dims);
      console.log('SR tensor shape:', this.sr.dims);

      // @ts-ignore
      this.state = outputs['stateN'];
      console.log(this.state);

      const [isSpeech] = outputs['output']?.data;

      return isSpeech as number;
    } catch (error: any) {
      console.error('Error processing audio chunk:', error);
      console.error('Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        wasmError: error?.wasmError,
      });
      console.error('Input tensor shape:', inputTensor.dims);
      console.error('Input tensor data:', inputTensor.data);
      console.error('State tensor shape:', this.state.dims);
      console.error('SR tensor shape:', this.sr.dims);
      // Return 0 (no speech) in case of error to prevent pipeline disruption
      return 0;
    }
  }

  async release() {
    await this.session.release();
  }
}

export default VAD;
