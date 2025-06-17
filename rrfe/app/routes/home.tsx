import { Toolbar } from '~/components/ToolBar';
import type { Route } from './+types/home';
import useLocalTranscription from '~/hooks/useLocalTranscription';
import { useEffect, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { LoaderCircle } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Tyny | Real-time translation' }];
}

export default function Home() {
  const scrollRef = useRef<HTMLDivElement>(null);
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

  const {
    streamState,
    toggleStreaming,
    isSpeaking,
    transcription,
    isLoadingModels,
  } = useLocalTranscription({
      input: {
        deviceId: selectedDevice,
        file: fileBuffer,
      },
      targetLanguage: selectedLanguage,
    });

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
    }
  }, [transcription]);

  return (
    <div className="h-screen w-full border border-green-500">
      <div className="h-full w-full max-w-5xl mx-auto grid grid-rows-[1fr_auto] gap-2 border border-red-500 p-4">
        <div className="border border-blue-500 overflow-y-auto">
          <div className="flex flex-col gap-2 border border-yellow-500">
            {transcription.map((t) => (
              <div key={t.transcriptionId} className="grid grid-cols-2 gap-2">
                <p>{t.transcription.map((t) => t.output).join('')}</p>
                <p>{t.translation?.map((t) => t.output).join('')}</p>
              </div>
            ))}
            <div ref={scrollRef}></div>
          </div>
        </div>
        <AlertDialog open={isLoadingModels}>
          <AlertDialogContent>
            <VisuallyHidden>
              <AlertDialogTitle>Loading models</AlertDialogTitle>
            </VisuallyHidden>
            <div className="mx-auto flex items-center gap-2">
              <LoaderCircle className="animate-spin" />
              Loading models
            </div>
          </AlertDialogContent>
        </AlertDialog>
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
