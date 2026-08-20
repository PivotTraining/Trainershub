import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/** Web-only document shell used by Expo Router static rendering. */
export default function Root({ children }: PropsWithChildren) {
  const description = 'Find trainers, book sessions, manage clients, and run your training business from any device.';

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <title>TrainerHub | Find, Book & Train</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        <meta name="theme-color" content="#111111" />
        <meta name="application-name" content="TrainerHub" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TrainerHub" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="TrainerHub" />
        <meta property="og:title" content="TrainerHub | Find, Book & Train" />
        <meta property="og:description" content={description} />
        <meta property="og:url" content="https://trainershub.app/" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="TrainerHub | Find, Book & Train" />
        <meta name="twitter:description" content={description} />

        <link rel="canonical" href="https://trainershub.app/" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/trainerhub-icon.svg" type="image/svg+xml" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
