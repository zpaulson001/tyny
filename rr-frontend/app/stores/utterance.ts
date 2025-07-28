import { create } from 'zustand';

interface Text {
  committed?: string;
  volatile?: string;
}

interface Translations {
  [languageCode: string]: Text;
}

interface UtteranceActions {
  putTranscription: (utteranceId: number, transcription: Text) => void;
  putTranslation: (
    utteranceId: number,
    languageCode: string,
    translation: Text
  ) => void;
  clearUtterances: () => void;
}

interface Utterance {
  utteranceId: number;
  transcription: Text;
  translations: Translations;
}

interface UtteranceStore {
  utterances: Map<number, Utterance>;
  actions: UtteranceActions;
}

const useUtteranceStore = create<UtteranceStore>((set) => ({
  utterances: new Map(),
  actions: {
    putTranscription: (utteranceId: number, transcription: Text) =>
      set((state) => {
        const newUtterances = new Map(state.utterances);
        if (!newUtterances.has(utteranceId)) {
          newUtterances.set(utteranceId, {
            utteranceId,
            transcription,
            translations: {},
          });
        } else {
          newUtterances.get(utteranceId)!.transcription = transcription;
        }
        return { utterances: newUtterances };
      }),
    putTranslation: (
      utteranceId: number,
      languageCode: string,
      translation: Text
    ) =>
      set((state) => {
        const newUtterances = new Map(state.utterances);
        const utterance = newUtterances.get(utteranceId);

        if (!utterance) {
          return { utterances: newUtterances };
        }

        utterance.translations[languageCode] = translation;

        return { utterances: newUtterances };
      }),
    clearUtterances: () => set({ utterances: new Map() }),
  },
}));

export const useUtterances = () =>
  useUtteranceStore((state) => state.utterances);

export const useUtteranceActions = () => {
  return useUtteranceStore((state) => state.actions);
};
