import * as ort from 'onnxruntime-web';

// Initialize LSTM states (batch_size=1, num_layers=1, hidden_size=128)
let stateTensor = new ort.Tensor(
  'float32',
  new Float32Array(2 * 1 * 128),
  [2, 1, 128]
);
console.log('LSTM states initialized');

class SileroONNX {
  static session = null;

  static async getSession() {
    console.log('Getting ONNX session...');
    if (this.session) {
      console.log('Using existing session');
      return this.session;
    }

    console.log('Creating new ONNX session...');
    try {
      this.session = await ort.InferenceSession.create(
        '/models/silero_vad.onnx',
        {
          executionProviders: ['webgpu', 'webgl', 'wasm'],
          graphOptimizationLevel: 'all',
        }
      );
      console.log('ONNX session created successfully');
      return this.session;
    } catch (error) {
      console.error('Failed to create ONNX session:', error);
      self.postMessage({
        status: 'error',
        error: error.message,
      });
      throw error;
    }
  }
}

let processing = false;
async function runVADInference(audioChunk) {
  if (processing) return;
  processing = true;

  // Tell the main thread we are starting
  self.postMessage({ status: 'start' });

  // Retrieve the text-generation pipeline.
  const session = await SileroONNX.getSession();

  // Configure input tensors
  const audioInput = new ort.Tensor('float32', audioChunk, [
    1,
    audioChunk.length,
  ]);
  const srInput = new ort.Tensor('int64', [16000n]);

  const inputs = {
    input: audioInput,
    sr: srInput,
    state: stateTensor,
  };

  try {
    const outputs = await session.run(inputs);
    console.log('Outputs:', outputs);
    const speechProb = outputs.output.data[0]; // The probability of speech
    const state = outputs.stateN.data;
    console.log('State:', state);
    stateTensor = new ort.Tensor('float32', state, [2, 1, 128]);

    console.log('speechProb', speechProb);

    self.postMessage({
      status: 'complete',
      output: {
        speechProb,
        audioChunk,
      },
    });
  } catch (e) {
    console.error('Error running VAD inference:', e);
    self.postMessage({
      status: 'error',
      error: e,
    });
  }

  processing = false;
}

async function load() {
  console.log('Starting model load...');
  self.postMessage({
    status: 'loading',
    data: 'Loading model...',
  });

  try {
    await SileroONNX.getSession();
    console.log('Model loaded successfully');
    self.postMessage({ status: 'ready' });
  } catch (error) {
    console.error('Failed to load model:', error);
    self.postMessage({
      status: 'error',
      error: error.message,
    });
  }
}

function resetState() {
  stateTensor = new ort.Tensor(
    'float32',
    new Float32Array(2 * 1 * 128),
    [2, 1, 128]
  );
}

// Listen for messages from the main thread
self.addEventListener('message', async (e) => {
  console.log('Worker received message:', e.data);
  const { type, data } = e.data;

  switch (type) {
    case 'load':
      load();
      break;

    case 'inference':
      runVADInference(data);
      break;

    case 'healthcheck':
      console.log('Health check received');
      self.postMessage({ status: 'ready' });
      break;
    case 'reset':
      resetState();
      break;
  }
});

// Send ready message when worker starts
console.log('Worker initialized');
self.postMessage({ status: 'ready' });
