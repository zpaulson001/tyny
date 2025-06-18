import { Toolbar } from '~/components/ToolBar';
import type { Route } from './+types/home';
import useLocalTranscription from '~/hooks/useLocalTranscription';
import { useEffect, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { LoaderCircle } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useToolbarContext } from '~/hooks/ToolbarContext';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Tyny | Real-time translation' }];
}

export default function Home() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { state } = useToolbarContext();

  const {
    streamState,
    toggleStreaming,
    isSpeaking,
    transcription,
    isLoadingModels,
  } = useLocalTranscription({
    input: {
      deviceId: state.selectedDeviceId,
      file: state.fileBuffer,
    },
    targetLanguage: state.selectedLanguage,
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
          isSpeaking={isSpeaking}
          streamState={streamState}
          toggleStreaming={toggleStreaming}
        />
      </div>
    </div>
  );
}
