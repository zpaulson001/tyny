import type { Route } from './+types/room';

export default function Room({ params }: Route.ComponentProps) {
  const { roomId } = params;

  return (
    <div>
      <h1>Room {roomId}</h1>
    </div>
  );
}
