interface Text {
  committed?: string;
  volatile?: string;
}

interface Translations {
  [languageCode: string]: Text;
}

interface Utterance {
  utteranceId: number;
  transcription: Text;
  translations: Translations;
}

export const useUtterancesStore = defineStore('utterances', () => {
  const utterances = ref<Map<number, Utterance>>(new Map<number, Utterance>());

  function putTranscription(utteranceId: number, transcription: Text) {
    if (!utterances.value.has(utteranceId)) {
      utterances.value.set(utteranceId, {
        utteranceId,
        transcription,
        translations: {},
      });
    } else {
      const utterance = utterances.value.get(utteranceId)!;
      utterance.transcription = transcription;
    }
    // Force reactivity by creating a new Map reference
    utterances.value = new Map(utterances.value);
  }

  function putTranslation(
    utteranceId: number,
    languageCode: string,
    translation: Text
  ) {
    const utterance = utterances.value.get(utteranceId);

    if (!utterance) {
      return;
    }

    utterance.translations[languageCode] = translation;
    // Force reactivity by creating a new Map reference
    utterances.value = new Map(utterances.value);
  }

  function clearUtterances() {
    utterances.value.clear();
    // Force reactivity by creating a new Map reference
    utterances.value = new Map(utterances.value);
  }

  return {
    utterances,
    putTranscription,
    putTranslation,
    clearUtterances,
  };
});
