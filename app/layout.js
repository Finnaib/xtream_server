import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata = {
  title: 'Xtream Server',
  description: 'IPTV Streaming Server',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
