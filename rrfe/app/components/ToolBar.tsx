import { Button } from './ui/button';
import { DeviceSelect } from './DeviceSelect';

import {
  AudioWaveform,
  Circle,
  LoaderCircle,
  Speech,
  StopCircle,
} from 'lucide-react';
import { useState } from 'react';

import { TranscriptionSettingsMenu } from './TranscriptionSettingsMenu';
import useTranscription from '../hooks/useTranscription';
import useRemoteTranscription from '~/hooks/useRemoteTranscription';
export function Toolbar() {
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const { streamState, toggleStreaming, isSpeaking, transcription } =
    useRemoteTranscription(selectedDevice);

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center border border-border px-4 py-2 gap-4 rounded-lg bg-background shadow-lg">
        <TranscriptionSettingsMenu />
        <DeviceSelect
          selectedDevice={selectedDevice}
          setSelectedDevice={setSelectedDevice}
        />

        {isSpeaking ? <Speech /> : <AudioWaveform />}

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
      <div>
        {transcription.map((t) => (
          <p key={t.id}>
            {t.text} ({t.inferenceTime.toFixed(2)}s)
          </p>
        ))}
      </div>
    </>
  );
}
