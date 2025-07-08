import { create } from 'zustand';

interface TranscriptionToken {
  value: string;
  tokenId: number;
}

interface TranslationToken {
  value: string;
  tokenId: number;
}

interface UtteranceActions {
  addTranscriptionToken: (
    utteranceId: number,
    transcription: TranscriptionToken
  ) => void;
  addTranslationToken: (
    utteranceId: number,
    translation: TranslationToken
  ) => void;
  clearUtterances: () => void;
}

interface Utterance {
  utteranceId: number;
  transcription: TranscriptionToken[];
  translation?: TranslationToken[];
}

interface UtteranceStore {
  utterances: Map<number, Utterance>;
  actions: UtteranceActions;
}

const useUtteranceStore = create<UtteranceStore>((set) => ({
  utterances: new Map(),
  actions: {
    addTranscriptionToken: (
      utteranceId: number,
      transcription: TranscriptionToken
    ) =>
      set((state) => {
        const newUtterances = new Map(state.utterances);
        if (!newUtterances.has(utteranceId)) {
          newUtterances.set(utteranceId, {
            utteranceId,
            transcription: [transcription],
            translation: [],
          });
        } else {
          newUtterances.get(utteranceId)?.transcription.push(transcription);
        }
        return { utterances: newUtterances };
      }),
    addTranslationToken: (utteranceId: number, translation: TranslationToken) =>
      set((state) => {
        const newUtterances = new Map(state.utterances);
        const utterance = newUtterances.get(utteranceId);

        if (!utterance) {
          return { utterances: newUtterances };
        }

        if (!utterance.translation) {
          utterance.translation = [translation];
        } else {
          utterance.translation.push(translation);
        }

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
