import { Circle, LoaderCircle, Play, Square } from 'lucide-react';
import { Button } from './ui/button';

export default function PlayStopButton({
  streamState,
  mode,
  onClick,
}: {
  streamState: string;
  mode: 'file' | 'mic';
  onClick: () => void;
}) {
  const isLoading = streamState === 'connecting' || streamState === 'warmingUp';
  if (mode === 'file') {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={onClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <LoaderCircle className="animate-spin" />
        ) : streamState === 'streaming' ? (
          <Square />
        ) : (
          <Play />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={streamState === 'streaming' ? 'destructive' : 'outline'}
      size="icon"
      onClick={onClick}
      disabled={streamState === 'connecting'}
    >
      {streamState === 'connecting' ? (
        <LoaderCircle className="animate-spin" />
      ) : streamState === 'streaming' ? (
        <Square />
      ) : (
        <Circle fill="var(--destructive)" stroke="transparent" />
      )}
    </Button>
  );
}
