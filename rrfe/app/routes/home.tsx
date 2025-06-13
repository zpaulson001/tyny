import { Toolbar } from '~/components/ToolBar';
import type { Route } from './+types/home';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Tyny | Real-time translation' }];
}

export default function Home() {
  return (
    <div className="h-full w-full">
      <Toolbar />
    </div>
  );
}
