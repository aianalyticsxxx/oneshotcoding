import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import { ThemedBackground } from '@/components/layout/ThemedBackground';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://oneshotcoding.io'),
  title: {
    default: 'oneshotcoding - Daily Coding Challenges with Rewards',
    template: '%s | oneshotcoding',
  },
  description:
    'A platform for the coding community to learn and teach others through daily challenges with rewards. One prompt. One response. Ship it.',
  keywords: [
    'oneshotcoding',
    'coding challenges',
    'ai coding',
    'vibecoding',
    'prompt engineering',
    'developer community',
    'coding competition',
    'learn to code',
    'ai prompts',
    'daily challenges',
  ],
  authors: [{ name: 'oneshotcoding Team' }],
  creator: 'oneshotcoding',
  publisher: 'oneshotcoding',
  openGraph: {
    title: 'oneshotcoding - Daily Coding Challenges with Rewards',
    description:
      'A platform for the coding community to learn and teach others through daily challenges with rewards. One prompt. One response. Ship it.',
    url: 'https://oneshotcoding.io',
    siteName: 'oneshotcoding',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png?v=2',
        width: 1200,
        height: 630,
        alt: 'oneshotcoding - Daily Coding Challenges',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'oneshotcoding - Daily Coding Challenges with Rewards',
    description:
      'A platform for the coding community to learn and teach others through daily challenges with rewards.',
    creator: '@oneshotcoding',
    images: ['/og-image.png?v=2'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#D97706',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen overflow-x-hidden bg-terminal-bg text-terminal-text font-sans">
        <Providers>
          <ThemedBackground />
          <div className="relative z-10 min-h-screen">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
