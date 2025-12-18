import './globals.css';
import { Providers } from './providers';
import CookieConsent from '../components/CookieConsent';

export const metadata = {
  title: 'Christian Counseling Online - Biblical Guidance & AI Counseling Tools 24/7',
  description: 'Get Christian counseling online with AI-powered biblical guidance tools. Scripture-based counseling, faith-based therapy, and spiritual support available 24/7. Free trial available.',
  keywords: [
    // Primary Keywords
    'Christian counseling',
    'biblical counseling',
    'AI counseling',
    'counseling tools',
    // Christian & Faith-Based
    'online Christian counselor',
    'Christian therapy online',
    'faith-based counseling',
    'scripture-based counseling',
    'biblical guidance',
    'Christian mental health',
    'spiritual counseling',
    'pastoral counseling online',
    'Christian life coaching',
    'prayer counseling',
    // AI & Technology
    'AI Christian counselor',
    'AI biblical guidance',
    'Christian AI chatbot',
    'automated counseling',
    'virtual Christian counselor',
    'online therapy tools',
    'digital counseling platform',
    // Specific Issues
    'Christian marriage counseling',
    'Christian anxiety help',
    'Christian depression support',
    'Christian relationship advice',
    'Christian grief counseling',
    'Christian stress management',
    'Christian addiction recovery',
    'Christian family counseling',
    // Service Features
    '24/7 Christian support',
    'confidential Christian counseling',
    'private faith counseling',
    'anonymous Christian therapy',
    'instant biblical guidance',
    'free Christian counseling trial',
  ].join(', '),
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  authors: [{ name: 'MyChristianCounselor' }],
  creator: 'MyChristianCounselor',
  publisher: 'MyChristianCounselor',
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
  openGraph: {
    title: 'Christian Counseling Online - Biblical Guidance & AI Counseling Tools',
    description: 'Get Christian counseling with AI-powered biblical guidance tools. Scripture-based counseling available 24/7 with complete confidentiality.',
    url: 'https://www.mychristiancounselor.online',
    siteName: 'MyChristianCounselor',
    locale: 'en_US',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.mychristiancounselor.online',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
