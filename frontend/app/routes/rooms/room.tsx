import { useRef } from 'react';
import type { Route } from './+types/room';
import SubscriberToolbar from '~/components/SubscriberToolbar';
import { ApiClient } from '~/lib/api-client';
import useSubscription from '~/hooks/useSubscription';
import { useToolbar } from '~/stores/toolbar';

export async function clientLoader({ params }: Route.LoaderArgs) {
  const { roomId } = params;
  const client = new ApiClient();
  try {
    const [room, availableLanguages] = await Promise.all([
      client.getRoom(roomId as string),
      client.getAvailableLanguages(),
    ]);
    return { room, availableLanguages };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export default function Room({ loaderData, params }: Route.ComponentProps) {
  const { error, availableLanguages } = loaderData;
  const { roomId } = params;
  const scrollRef = useRef<HTMLDivElement>(null);

  const { selectedLanguages } = useToolbar();

  const { subscriptionState, toggleSubscribing, utterances, clearUtterances } =
    useSubscription({
      targetLanguages: selectedLanguages,
    });

  if (error) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <div className="h-full w-full max-w-5xl mx-auto grid grid-rows-[1fr_auto] gap-2 p-4">
        <div className="overflow-y-auto">
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
        <SubscriberToolbar
          subscriptionState={subscriptionState}
          onToggle={() => toggleSubscribing(roomId)}
          languageOptions={availableLanguages || []}
        />
      </div>
    </div>
  );
}
