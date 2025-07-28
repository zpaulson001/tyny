import { Form, redirect, useFetcher } from 'react-router';
import { Button } from '~/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '~/components/ui/input-otp';
import type { Route } from './+types/home';
import { REGEXP_ONLY_DIGITS } from 'input-otp';

export async function clientAction({ request }: Route.ClientActionArgs) {
  let formData = await request.formData();
  let roomCode = formData.get('room-code');
  console.log('roomCode', roomCode);
  return redirect(`/rooms/${roomCode}`);
}

export default function RoomHome() {
  const fetcher = useFetcher();
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <fetcher.Form method="post" className="flex flex-col items-center gap-4">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-bold">Join a Room</h1>
          <p className="text-sm text-muted-foreground">
            Enter the 4 digit code to join.
          </p>
        </div>

        <InputOTP
          maxLength={4}
          minLength={4}
          pattern={REGEXP_ONLY_DIGITS}
          name="room-code"
          required
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
        <Button type="submit">Join Room</Button>
      </fetcher.Form>
    </div>
  );
}
