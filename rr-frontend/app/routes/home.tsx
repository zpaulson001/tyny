import { Toolbar } from '~/components/ToolBar';
import type { Route } from './+types/home';
import { useEffect, useRef } from 'react';

import { LoaderCircle } from 'lucide-react';
import { useToolbar } from '~/stores/toolbar';
import { ApiClient } from '~/lib/api-client';
import useRemoteTranscription from '~/hooks/useRemoteTranscription';
import useSubscription from '~/hooks/useSubscription';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Tyny | Real-time Translation' }];
}

// Check WebGPU support safely at runtime
// let IS_WEBGPU_AVAILABLE = false;
// if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
//   IS_WEBGPU_AVAILABLE = !!navigator.gpu;
// }

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const apiClient = new ApiClient();
  const availableLanguages = await apiClient.getAvailableLanguages();
  return { availableLanguages };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { availableLanguages } = loaderData;
  const scrollRef = useRef<HTMLDivElement>(null);
  const { selectedDeviceId, fileBuffer, selectedLanguages } = useToolbar();

  const { subscriptionState, toggleSubscribing, utterances, clearUtterances } =
    useSubscription({
      targetLanguages: selectedLanguages,
    });

  const { streamState, toggleStreaming, isSpeaking } = useRemoteTranscription({
    input: {
      deviceId: selectedDeviceId,
      file: fileBuffer,
    },
    onRoomCreated: toggleSubscribing,
  });

  // Helper function to get loading message based on stream state
  const getLoadingMessage = () => {
    switch (streamState) {
      case 'connecting':
        return 'Connecting to server...';
      case 'warmingUp':
        return 'Warming up models (This may take up to 1 minute)';
      case 'error':
        return 'Connection error. Please try again.';
      default:
        return '';
    }
  };

  const isLoading = streamState === 'connecting' || streamState === 'warmingUp';

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
    }
  }, [utterances]);

  // if (!IS_WEBGPU_AVAILABLE) {
  //   return (
  //     <div className="h-screen w-full flex items-center justify-center">
  //       <div className="text-center max-w-md mx-auto p-6">
  //         <h1 className="text-2xl font-bold mb-4">WebGPU Not Supported</h1>
  //         <p className="text-gray-600 mb-4">
  //           This application requires WebGPU support, which is not available in
  //           your browser. Please try again using a browser that supports WebGPU.
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="h-screen w-full">
      <div className="h-full w-full max-w-5xl mx-auto grid grid-rows-[1fr_auto] gap-2 p-4">
        <div className="overflow-y-auto">
          {/* Status indicator for stream state */}
          {isLoading && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <LoaderCircle className="animate-spin h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800 font-medium">
                  {getLoadingMessage()}
                </span>
              </div>
            </div>
          )}

          {/* Error state */}
          {streamState === 'error' && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-800 font-medium">
                  {getLoadingMessage()}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {Array.from(utterances.values()).map((u) => (
              <div key={u.utteranceId} className="flex gap-4">
                <p
                  className={`flex-1 ${
                    !u.transcription.committed ? 'text-gray-500' : ''
                  }`}
                >
                  {u.transcription.committed
                    ? u.transcription.committed
                    : u.transcription.volatile}
                </p>
                {Object.entries(u.translations).map(
                  ([languageCode, translation]) => (
                    <p
                      key={languageCode}
                      className={`flex-1 ${
                        !translation.committed ? 'text-gray-500' : ''
                      }`}
                    >
                      {translation.committed
                        ? translation.committed
                        : translation.volatile}
                    </p>
                  )
                )}
              </div>
            ))}
            <div ref={scrollRef}></div>
          </div>
        </div>
        <Toolbar
          isSpeaking={isSpeaking}
          streamState={streamState}
          onToggle={() => {
            toggleStreaming();
            toggleSubscribing();
          }}
          languageOptions={availableLanguages}
        />
      </div>
    </div>
  );
}
