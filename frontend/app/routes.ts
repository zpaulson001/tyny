import {
  type RouteConfig,
  index,
  prefix,
  route,
} from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  ...prefix('rooms', [
    index('routes/rooms/home.tsx'),
    route(':roomId', 'routes/rooms/room.tsx'),
  ]),
] satisfies RouteConfig;
