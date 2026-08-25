import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />

        <meta content="IE=edge" httpEquiv="X-UA-Compatible" />

        <meta content="light" name="color-scheme" />

        <meta content="width=device-width, initial-scale=1, viewport-fit=cover" name="viewport" />

        <meta content="#C18DB4" name="theme-color" />

        <meta content="Study Companion" name="application-name" />

        <meta content="yes" name="apple-mobile-web-app-capable" />

        <meta content="default" name="apple-mobile-web-app-status-bar-style" />

        <meta content="Study Companion" name="apple-mobile-web-app-title" />

        <meta content="telephone=no" name="format-detection" />

        <meta
          content="A calm planner for classes, activities, exams, quizzes, and focused study."
          name="description"
        />

        <link href="/manifest.json" rel="manifest" />

        <link href="/favicon.png" rel="icon" type="image/png" />

        <link href="/favicon.png" rel="apple-touch-icon" />

        <ScrollViewStyleReset />

        <script
          dangerouslySetInnerHTML={{
            __html: registerServiceWorker,
          }}
        />
      </head>

      <body>{children}</body>
    </html>
  );
}

const registerServiceWorker = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(function (error) {
        console.warn(
          'Study Companion service worker registration failed:',
          error
        );
      });
  });
}
`;
