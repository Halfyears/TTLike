import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from '@/lib/constants'


const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · AI TikTok Viral Intelligence`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} · AI TikTok Viral Intelligence`,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <head>
        {/* Bing Webmaster Tools site verification */}
        <meta name="msvalidate.01" content="701F44DD8CD51992D895FDE510E30B05" />
      </head>
      <body className="min-h-screen bg-white font-sans antialiased">
        {children}

        {/* ── F1: Google Analytics 4 (G-87PJR2NW87) ─────────────────────── */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-87PJR2NW87"
          strategy="afterInteractive"
          async
        />
        <Script id="ga4-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-87PJR2NW87');
        `}</Script>

        {/* ── F3: ContentSquare UX Analytics ────────────────────────────── */}
        <Script
          src="https://t.contentsquare.net/uxa/8f8886ab19253.js"
          strategy="afterInteractive"
          async
        />
      </body>
    </html>
  )
}
