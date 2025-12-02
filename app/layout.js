import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'Xtream Server',
  description: 'Next.js Xtream Codes API Server',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
