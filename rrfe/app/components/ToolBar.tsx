import { Button } from './ui/button';
import { DeviceSelect } from './DeviceSelect';

import {
  AudioWaveform,
  Circle,
  LoaderCircle,
  Speech,
  StopCircle,
} from 'lucide-react';
import { useRef, useState } from 'react';

import { TranscriptionSettingsMenu } from './TranscriptionSettingsMenu';
import useLocalTranscription from '../hooks/useLocalTranscription';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';

export function Toolbar() {
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | undefined>(
    undefined
  );
  const [isTestMode, setIsTestMode] = useState(false);
  const { streamState, toggleStreaming, isSpeaking, mostRecentTranscription } =
    useLocalTranscription({
      deviceId: selectedDevice,
      file: fileBuffer,
    });

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
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center border border-border px-4 py-2 gap-4 rounded-lg bg-background shadow-lg">
        <TranscriptionSettingsMenu />
        <div className="flex items-center space-x-2">
          <Switch
            id="test-mode"
            checked={isTestMode}
            onCheckedChange={setIsTestMode}
          />
          <Label htmlFor="test-mode">Test Mode</Label>
        </div>
        {isTestMode && (
          <div className="flex items-center space-x-2 w-32">
            <Input type="file" accept="audio/*" onChange={handleFileChange} />
          </div>
        )}
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
        <p>{mostRecentTranscription}</p>
      </div>
    </>
  );
}
