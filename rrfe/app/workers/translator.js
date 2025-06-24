import { pipeline, TextStreamer } from '@huggingface/transformers';

/**
 * This class uses the Singleton pattern to ensure that only one instance of the
 * pipeline is loaded. This is because loading the pipeline is an expensive
 * operation and we don't want to do it every time we want to translate a sentence.
 */
class TranslationPipeline {
  static task = 'translation';
  static model = 'Xenova/nllb-200-distilled-600M';
  static translator = null;

  static async getInstance(progress_callback = null) {
    this.translator ??= await pipeline(this.task, this.model, {
      progress_callback,
    });

    return this.translator;
  }
}

async function load() {
  self.postMessage({
    status: 'loading',
    data: 'Loading model...',
  });

  await TranslationPipeline.getInstance((x) => {
    self.postMessage(x);
  });

  self.postMessage({ status: 'ready' });
}

async function generate(text, targetLanguage, id) {
  try {
    const translator = await TranslationPipeline.getInstance();

    console.log('Target language:', targetLanguage);
    console.log('Text to translate:', text);

    if (!targetLanguage) {
      throw new Error('No target language specified');
    }

    let tokenId = 0;

    const streamer = new TextStreamer(translator.tokenizer, {
      skip_special_tokens: true,
      skip_prompt: true,
      callback_function: (x) => {
        self.postMessage({
          status: 'update',
          value: x,
          utteranceId: id,
          tokenId: tokenId,
        });
        tokenId++;
      },
    });

    // Actually perform the translation
    let output = await translator(text, {
      tgt_lang: targetLanguage,
      src_lang: 'eng_Latn',
      streamer,
    });

    // Send the output back to the main thread
    self.postMessage({
      status: 'complete',
      output: output,
      id: id,
    });
  } catch (error) {
    console.error('Error in generate function:', error);
    self.postMessage({
      status: 'error',
      error: error.message || 'Translation failed',
    });
  }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  try {
    const { type, data, id } = event.data;

    switch (type) {
      case 'load':
        load();
        break;
      case 'generate':
        if (!data?.text || !data?.targetLanguage) {
          throw new Error(
            'Missing required data for translation: text and targetLanguage are required'
          );
        }
        generate(data.text, data.targetLanguage, id);
        break;
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error('Error in translator worker:', error);
    self.postMessage({
      status: 'error',
      error: error.message || 'An unknown error occurred',
    });
  }
});
