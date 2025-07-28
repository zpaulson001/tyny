import { DeviceSelect } from './DeviceSelect';

import { Speech, FileMusic, Mic, Ellipsis } from 'lucide-react';

import { Input } from './ui/input';
import { LanguageCombobox } from './LanguageCombobox';
import { type AvailableLanguages } from '~/lib/api-client';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { useToolbar, useToolbarActions } from '~/stores/toolbar';
import PlayStopButton from './PlayStopButton';

interface ToolbarProps {
  streamState: string;
  onToggle: () => void;
  isSpeaking: boolean;
  languageOptions: AvailableLanguages;
}

export function Toolbar({
  isSpeaking,
  streamState,
  onToggle,
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
        onClick={onToggle}
      />
    </div>
  );
}
