import { Button } from './ui/button';
import { DeviceSelect } from './DeviceSelect';

import {
  Circle,
  LoaderCircle,
  Speech,
  Square,
  FileMusic,
  Mic,
  Play,
  Ellipsis,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import useLocalTranscription from '../hooks/useLocalTranscription';
import { Input } from './ui/input';
import { LanguageSelect } from './LanguageSelect';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

function PlayStopButton({
  streamState,
  mode,
  onClick,
}: {
  streamState: string;
  mode: 'file' | 'mic';
  onClick: () => void;
}) {
  if (mode === 'file') {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={onClick}
        disabled={streamState === 'connecting'}
      >
        {streamState === 'connecting' ? (
          <LoaderCircle className="animate-spin" />
        ) : streamState === 'streaming' ? (
          <Square />
        ) : (
          <Play />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={streamState === 'streaming' ? 'destructive' : 'outline'}
      size="icon"
      onClick={onClick}
      disabled={streamState === 'connecting'}
    >
      {streamState === 'connecting' ? (
        <LoaderCircle className="animate-spin" />
      ) : streamState === 'streaming' ? (
        <Square />
      ) : (
        <Circle fill="var(--destructive)" stroke="transparent" />
      )}
    </Button>
  );
}

interface ToolbarProps {
  streamState: string;
  toggleStreaming: () => void;
  selectedDevice: string;
  setSelectedDevice: (device: string) => void;
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  isSpeaking: boolean;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Toolbar({
  selectedDevice,
  setSelectedDevice,
  selectedLanguage,
  setSelectedLanguage,
  isSpeaking,
  onFileInputChange,
  streamState,
  toggleStreaming,
}: ToolbarProps) {
  const [mode, setMode] = useState<'file' | 'mic'>('mic');

  const handleModeChange = (value: string) => {
    if (value !== 'file' && value !== 'mic') {
      throw new Error('Invalid mode. Must be either "file" or "mic".');
    }
    setMode(value);
  };

  return (
    <div className=" w-fit-content flex items-center justify-center border border-border px-4 py-4 gap-4 rounded-lg bg-background shadow-lg">
      <div className="flex items-center space-x-2">
        <ToggleGroup
          type="single"
          variant="outline"
          value={mode}
          onValueChange={handleModeChange}
          className="flex items-center"
        >
          <ToggleGroupItem value="file" aria-label="File Mode">
            <FileMusic />
            File Mode
          </ToggleGroupItem>
          <ToggleGroupItem value="mic" aria-label="Mic Mode">
            <Mic />
            Mic Mode
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {mode === 'file' ? (
        <Input
          type="file"
          accept="audio/*"
          onChange={onFileInputChange}
          className="min-w-48 flex-1"
        />
      ) : (
        <DeviceSelect
          selectedDevice={selectedDevice}
          setSelectedDevice={setSelectedDevice}
        />
      )}

      <LanguageSelect value={selectedLanguage} onChange={setSelectedLanguage} />

      {isSpeaking ? (
        <div className="flex items-center space-x-2">
          <Speech />
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <Ellipsis />
        </div>
      )}
      <PlayStopButton
        streamState={streamState}
        mode={mode}
        onClick={toggleStreaming}
      />
    </div>
  );
}
