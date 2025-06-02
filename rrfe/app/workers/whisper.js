import { pipeline } from '@huggingface/transformers';

const MAX_NEW_TOKENS = 64;

/**
 * This class uses the Singleton pattern to ensure that only one instance of the model is loaded.
 */
class AutomaticSpeechRecognitionPipeline {
  static transcriber = null;

  static async getInstance(progress_callback = null) {
    this.transcriber ??= await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-base',
      {
        progress_callback,
      }
    );
    return this.transcriber;
  }
}

let processing = false;
async function generate({ audio, language }) {
  if (processing) return;
  processing = true;

  // Tell the main thread we are starting
  self.postMessage({ status: 'start' });

  // Retrieve the text-generation pipeline.
  const transcriber = await AutomaticSpeechRecognitionPipeline.getInstance(
    (x) => {
      self.postMessage(x);
    }
  );

  const outputs = await transcriber(audio);

  console.log(outputs);

  // Send the output back to the main thread
  self.postMessage({
    status: 'complete',
    output: 'stuff',
  });
  processing = false;
}

async function load() {
  self.postMessage({
    status: 'loading',
    data: 'Loading model...',
  });

  // Load the pipeline and save it for future use.
  await AutomaticSpeechRecognitionPipeline.getInstance((x) => {
    // We also add a progress callback to the pipeline so that we can
    // track model loading.
    self.postMessage(x);
  });

  self.postMessage({ status: 'ready' });
}
// Listen for messages from the main thread
self.addEventListener('message', async (e) => {
  const { type, data } = e.data;

  switch (type) {
    case 'load':
      load();
      break;

    case 'generate':
      generate(data);
      break;
  }
});
