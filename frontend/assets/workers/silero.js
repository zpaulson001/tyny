// Remeber that Vite needs to be configured to not optimize onnxruntime-web!!
import * as ort from 'onnxruntime-web';

// Initialize LSTM states (batch_size=1, num_layers=1, hidden_size=128)
let stateTensor = new ort.Tensor(
  'float32',
  new Float32Array(2 * 1 * 128),
  [2, 1, 128]
);

const inferenceQueue = [];
let isProcessing = false;

class SileroONNX {
  static session = null;

  static async getSession() {
    if (this.session) {
      return this.session;
    }

    try {
      this.session = await ort.InferenceSession.create(
        '/models/silero_vad.onnx',
        {
          executionProviders: ['webgpu', 'wasm'],
          graphOptimizationLevel: 'all',
        }
      );
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

async function runVADInference() {
  if (isProcessing || inferenceQueue.length === 0) return;
  isProcessing = true;

  const { audioChunk, sequenceNumber } = inferenceQueue.shift();

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
    const speechProb = outputs.output.data[0]; // The probability of speech
    const state = outputs.stateN.data;
    stateTensor = new ort.Tensor('float32', state, [2, 1, 128]);

    self.postMessage({
      status: 'complete',
      output: {
        speechProb,
        audioChunk,
        sequenceNumber,
      },
    });
  } catch (e) {
    console.error('Error running VAD inference:', e);
    self.postMessage({
      status: 'error',
      error: e,
    });
  } finally {
    isProcessing = false;
    runVADInference();
  }
}

function enqueueInference(audioChunk, sequenceNumber) {
  inferenceQueue.push({ audioChunk, sequenceNumber });
  runVADInference();
}

async function load() {
  self.postMessage({
    status: 'loading',
    data: 'Loading model...',
  });

  try {
    await SileroONNX.getSession();
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
  const { type, data, sequenceNumber } = e.data;

  switch (type) {
    case 'load':
      load();
      break;

    case 'inference':
      enqueueInference(data, sequenceNumber);
      break;

    case 'healthcheck':
      self.postMessage({ status: 'ready' });
      break;
    case 'reset':
      resetState();
      break;
  }
});

// Send ready message when worker starts
self.postMessage({ status: 'ready' });
