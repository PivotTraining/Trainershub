import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/** Web-only document shell used by Expo Router static rendering. */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#111111" />
        <meta name="application-name" content="TrainerHub" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TrainerHub" />
        <meta
          name="description"
          content="Find trainers, book sessions, manage clients, and run your training business from any device."
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/trainerhub-icon.svg" type="image/svg+xml" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
