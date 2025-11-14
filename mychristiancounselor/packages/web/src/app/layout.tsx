import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'MyChristianCounselor',
  description: 'Biblical counseling and guidance',
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
        </Providers>
      </body>
    </html>
  );
}
