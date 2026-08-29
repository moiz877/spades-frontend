import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Nav } from '@/components/Nav';
import { LeadGateModal } from '@/components/LeadGateModal';
import { CommandPalette } from '@/components/CommandPalette';
import { OnboardingHint } from '@/components/OnboardingHint';
import { PageTransition } from '@/components/PageTransition';
import { Providers } from '@/components/Providers';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const SITE_NAME = 'ScaleCase';
const SITE_DESCRIPTION =
  'Techno-economic analysis on EIA Annual and International Energy Outlook data. Chart projections through 2050, compare series across regions, and quantify the 10-year cost impact on your facility.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}: Techno-Economic Analysis`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'techno-economic analysis',
    'EIA Annual Energy Outlook',
    'EIA International Energy Outlook',
    'energy price projections',
    'AEO2026',
    'energy cost forecasting',
  ],
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        {/* eslint-disable-next-line react/no-danger */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Providers>
          <Nav />
          <PageTransition>{children}</PageTransition>
          <LeadGateModal />
          <CommandPalette />
          <OnboardingHint />
        </Providers>
      </body>
    </html>
  );
}
