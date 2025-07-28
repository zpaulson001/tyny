import { create } from 'zustand';

type AudioMode = 'file' | 'mic';

interface ToolbarActions {
  setMode: (mode: AudioMode) => void;
  setSelectedDeviceId: (deviceId: string) => void;
  setSelectedLanguages: (languages: string[]) => void;
  setFileBuffer: (fileBuffer: ArrayBuffer) => void;
}

interface ToolbarStore {
  mode: AudioMode;
  selectedDeviceId: string;
  selectedLanguages: string[];
  fileBuffer: ArrayBuffer | undefined;
  actions: ToolbarActions;
}
const useToolbarStore = create<ToolbarStore>((set) => ({
  mode: 'mic',
  selectedDeviceId: '',
  selectedLanguages: ['es'],
  fileBuffer: undefined,
  actions: {
    setMode: (mode) => set({ mode }),
    setSelectedDeviceId: (deviceId) => set({ selectedDeviceId: deviceId }),
    setSelectedLanguages: (languages) => set({ selectedLanguages: languages }),
    setFileBuffer: (fileBuffer) => set({ fileBuffer }),
  },
}));

export const useToolbar = () => useToolbarStore((state) => state);

export const useToolbarActions = () => {
  return useToolbarStore((state) => state.actions);
};
