import './globals.css';
import { Providers } from './providers';
import CookieConsent from '../components/CookieConsent';

export const metadata = {
  title: 'MyChristianCounselor',
  description: 'Biblical counseling and guidance',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
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
