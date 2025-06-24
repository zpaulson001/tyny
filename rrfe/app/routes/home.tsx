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
import { useToolbar } from '~/stores/toolbar';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Tyny | Real-time translation' }];
}

export default function Home() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { selectedDeviceId, fileBuffer, selectedLanguage } = useToolbar();

  const {
    streamState,
    toggleStreaming,
    isSpeaking,
    utterances,
    isLoadingModels,
  } = useLocalTranscription({
    input: {
      deviceId: selectedDeviceId,
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
    <div className="h-screen w-full">
      <div className="h-full w-full max-w-5xl mx-auto grid grid-rows-[1fr_auto] gap-2 p-4">
        <div className="overflow-y-auto">
          <div className="flex flex-col gap-2">
            {Array.from(utterances.values()).map((u) => (
              <div key={u.utteranceId} className="grid grid-cols-2 gap-2">
                <p>{u.transcription.map((t) => t.value).join('')}</p>
                <p>{u.translation?.map((t) => t.value).join('')}</p>
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
