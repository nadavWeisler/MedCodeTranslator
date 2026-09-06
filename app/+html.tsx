import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

import { getAssetUrl, getSiteUrl } from '../config/webDeployment';

const SITE_URL = getSiteUrl();
const IMAGE_URL = `${SITE_URL}social-preview.png`;
const SITE_TITLE = 'MedCode Clinical — Open-Source Clinical Terminology Lookup';
const SITE_DESCRIPTION =
  'MIT-licensed, offline multi-vocabulary search across ICD-10, ATC, LOINC (subset), HCPCS, and related coding systems — with a visible score and match method on every result.';

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

        <link rel="icon" href={getAssetUrl('favicon.ico')} />
        <link rel="apple-touch-icon" href={getAssetUrl('apple-touch-icon.png')} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root { height: 100%; margin: 0; }
              body {
                overflow: auto;
                background: #EEF2F6;
                font-family: "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
