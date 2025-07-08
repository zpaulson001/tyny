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

import { Input } from './ui/input';
import { LanguageCombobox } from './LanguageCombobox';
import { type AvailableLanguages } from '~/lib/api-client';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { useToolbar, useToolbarActions } from '~/stores/toolbar';

function PlayStopButton({
  streamState,
  mode,
  onClick,
}: {
  streamState: string;
  mode: 'file' | 'mic';
  onClick: () => void;
}) {
  const isLoading = streamState === 'connecting' || streamState === 'warmingUp';
  if (mode === 'file') {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={onClick}
        disabled={isLoading}
      >
        {isLoading ? (
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
  isSpeaking: boolean;
  languageOptions: AvailableLanguages;
}

export function Toolbar({
  isSpeaking,
  streamState,
  toggleStreaming,
  languageOptions,
}: ToolbarProps) {
  const { mode, selectedDeviceId, selectedLanguages } = useToolbar();

  const { setFileBuffer, setMode, setSelectedDeviceId, setSelectedLanguages } =
    useToolbarActions();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = async (e) => {
        setFileBuffer(e.target?.result as ArrayBuffer);
      };

      reader.onerror = (err) => {
        console.error('FileReader error:', err);
      };

      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className=" w-fit-content flex items-center justify-center border border-border px-4 py-4 gap-4 rounded-lg bg-background shadow-lg">
      <div className="flex items-center space-x-2">
        <ToggleGroup
          type="single"
          variant="outline"
          value={mode}
          onValueChange={(value) => setMode(value as 'file' | 'mic')}
          className="flex items-center"
          disabled={streamState !== 'idle'}
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
          onChange={handleFileChange}
          className="min-w-48 flex-1"
          disabled={streamState !== 'idle'}
        />
      ) : (
        <DeviceSelect
          selectedDevice={selectedDeviceId}
          setSelectedDevice={setSelectedDeviceId}
          disabled={streamState !== 'idle'}
        />
      )}

      <LanguageCombobox
        options={languageOptions}
        values={selectedLanguages}
        onChange={(languages) => setSelectedLanguages(languages)}
        disabled={streamState !== 'idle'}
      />

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
