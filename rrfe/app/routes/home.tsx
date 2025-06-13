import { Toolbar } from '~/components/ToolBar';
import type { Route } from './+types/home';
import useLocalTranscription from '~/hooks/useLocalTranscription';
import { useState } from 'react';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Tyny | Real-time translation' }];
}

export default function Home() {
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('spa_Latn');
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | undefined>(
    undefined
  );

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

  const { streamState, toggleStreaming, isSpeaking, transcription } =
    useLocalTranscription({
      input: {
        deviceId: selectedDevice,
        file: fileBuffer,
      },
      targetLanguage: selectedLanguage,
    });

  return (
    <div className="h-screen w-full border border-green-500">
      <div className="h-full w-full max-w-5xl mx-auto grid grid-rows-[1fr_auto] gap-2 border border-red-500 p-4">
        <div className="w-full grid gap-2 overflow-y-auto">
          {transcription.map((t) => (
            <div key={t.id} className="grid grid-cols-2 gap-2">
              <p>{t.text}</p>
              <p>{t.translation}</p>
            </div>
          ))}
        </div>
        <Toolbar
          selectedDevice={selectedDevice}
          setSelectedDevice={setSelectedDevice}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
          isSpeaking={isSpeaking}
          onFileInputChange={handleFileChange}
          streamState={streamState}
          toggleStreaming={toggleStreaming}
        />
      </div>
    </div>
  );
}
