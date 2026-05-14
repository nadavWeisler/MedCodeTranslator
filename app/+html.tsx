import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

const SITE_URL = 'https://nadavweisler.github.io/MedCodeTranslator/';
const IMAGE_URL = `${SITE_URL}social-preview.png`;
const SITE_TITLE = 'Med Code Translator';
const SITE_DESCRIPTION =
  'Search medications, diagnoses, labs, and procedures across multiple clinical coding systems.';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <title>{SITE_TITLE}</title>
        <meta name="description" content={SITE_DESCRIPTION} />

        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:title" content={SITE_TITLE} />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:image" content={IMAGE_URL} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SITE_TITLE} />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content={IMAGE_URL} />

        <link rel="icon" href="/MedCodeTranslator/favicon.ico" />
        <link rel="apple-touch-icon" href="/MedCodeTranslator/social-preview.png" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
