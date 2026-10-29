import { LaunchSky } from '@/components/LaunchSky';

export const metadata = { title: 'Launch a coin — QUAD' };

/** The launch page: one screen, no scroll. The era light brightens one era per step (components/LaunchSky.tsx). */
export default function LaunchPage() {
  return <LaunchSky />;
}
