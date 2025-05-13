import { Button } from './ui/button';
import { DeviceSelect } from './DeviceSelect';

import { Circle, LoaderCircle, Mic, StopCircle } from 'lucide-react';
import { useState } from 'react';

import { LanguageSelect } from './LanguageSelect';
import { TranscriptionSettingsMenu } from './TranscriptionSettingsMenu';
import useAudioStream from '../hooks/useAudioStream';
export function Toolbar() {
  const { streamState, toggleStreaming } = useAudioStream();
  const [selectedLanguages, setSelectedLanguages] = useState<string>();

  const languageList = [
    {
      label: 'Chinese',
      value: 'zh',
    },
    {
      label: 'Russian',
      value: 'ru',
    },
    {
      label: 'Spanish',
      value: 'es',
    },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center border border-border px-4 py-2 gap-4 rounded-lg bg-background shadow-lg">
      <TranscriptionSettingsMenu />
      <DeviceSelect />
      <LanguageSelect
        options={languageList}
        value={selectedLanguages}
        onChange={setSelectedLanguages}
      />

      <Button
        variant={streamState === 'streaming' ? 'destructive' : 'outline'}
        size="icon"
        onClick={toggleStreaming}
        disabled={streamState === 'connecting'}
      >
        {streamState === 'connecting' ? (
          <LoaderCircle className="animate-spin" />
        ) : streamState === 'streaming' ? (
          <StopCircle />
        ) : (
          <Circle fill="var(--destructive)" stroke="transparent" />
        )}
      </Button>
    </div>
  );
}
