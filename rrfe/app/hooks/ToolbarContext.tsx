import React, { createContext, useContext, useReducer } from 'react';
import type { AvailableLanguages } from '~/components/LanguageSelect';

interface ToolbarState {
  mode: 'file' | 'mic';
  selectedDeviceId: string;
  selectedLanguage: AvailableLanguages;
  fileBuffer: ArrayBuffer | undefined;
}

type ToolbarAction =
  | { type: 'setMode'; payload: 'file' | 'mic' }
  | { type: 'setSelectedDeviceId'; payload: string }
  | { type: 'setSelectedLanguage'; payload: AvailableLanguages }
  | { type: 'setFileBuffer'; payload: ArrayBuffer };

function toolbarReducer(
  state: ToolbarState,
  action: ToolbarAction
): ToolbarState {
  switch (action.type) {
    case 'setMode':
      return { ...state, mode: action.payload };
    case 'setSelectedDeviceId':
      return { ...state, selectedDeviceId: action.payload };
    case 'setSelectedLanguage':
      return { ...state, selectedLanguage: action.payload };
    case 'setFileBuffer':
      return { ...state, fileBuffer: action.payload };
    default:
      return state;
  }
}

interface ToolbarContextType {
  state: ToolbarState;
  setSelectedDeviceId: (deviceId: string) => void;
  setSelectedLanguage: (language: AvailableLanguages) => void;
  setFileBuffer: (fileBuffer: ArrayBuffer) => void;
  setMode: (mode: 'file' | 'mic') => void;
}

const ToolbarContext = createContext<ToolbarContextType | undefined>(undefined);

export const ToolbarProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [state, dispatch] = useReducer(toolbarReducer, {
    mode: 'mic',
    selectedDeviceId: '',
    selectedLanguage: 'spa_Latn',
    fileBuffer: undefined,
  });

  const setSelectedDeviceId = (deviceId: string) => {
    dispatch({ type: 'setSelectedDeviceId', payload: deviceId });
  };
  const setSelectedLanguage = (language: AvailableLanguages) => {
    dispatch({ type: 'setSelectedLanguage', payload: language });
  };
  const setFileBuffer = (fileBuffer: ArrayBuffer) => {
    dispatch({ type: 'setFileBuffer', payload: fileBuffer });
  };
  const setMode = (mode: 'file' | 'mic') => {
    dispatch({ type: 'setMode', payload: mode });
  };

  const contextValue: ToolbarContextType = {
    state,
    setSelectedDeviceId,
    setSelectedLanguage,
    setFileBuffer,
    setMode,
  };

  return (
    <ToolbarContext.Provider value={contextValue}>
      {children}
    </ToolbarContext.Provider>
  );
};

export const useToolbarContext = () => {
  const context = useContext(ToolbarContext);
  if (context === undefined) {
    throw new Error('useToolbar must be used within a ToolbarProvider');
  }
  return context;
};
