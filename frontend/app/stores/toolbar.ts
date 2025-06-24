import type { AvailableLanguages } from '~/components/LanguageSelect';
import { create } from 'zustand';

type AudioMode = 'file' | 'mic';

interface ToolbarActions {
  setMode: (mode: AudioMode) => void;
  setSelectedDeviceId: (deviceId: string) => void;
  setSelectedLanguage: (language: AvailableLanguages) => void;
  setFileBuffer: (fileBuffer: ArrayBuffer) => void;
}

interface ToolbarStore {
  mode: AudioMode;
  selectedDeviceId: string;
  selectedLanguage: AvailableLanguages;
  fileBuffer: ArrayBuffer | undefined;
  actions: ToolbarActions;
}
const useToolbarStore = create<ToolbarStore>((set) => ({
  mode: 'mic',
  selectedDeviceId: '',
  selectedLanguage: 'spa_Latn',
  fileBuffer: undefined,
  actions: {
    setMode: (mode) => set({ mode }),
    setSelectedDeviceId: (deviceId) => set({ selectedDeviceId: deviceId }),
    setSelectedLanguage: (language) => set({ selectedLanguage: language }),
    setFileBuffer: (fileBuffer) => set({ fileBuffer }),
  },
}));

export const useToolbar = () => useToolbarStore((state) => state);

export const useToolbarActions = () => {
  return useToolbarStore((state) => state.actions);
};
