import type { Metadata } from 'next'
import { Inter, Spectral, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Providers from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spectral = Spectral({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-spectral' })
const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains-mono' })

export const metadata: Metadata = {
  title: 'Permanence Protocol',
  description: 'Record a content hash on Arbitrum Sepolia and store readable text in an archive database. Verify the archived text against its on-chain hash. Testnet prototype; archive availability is not guaranteed.',
  icons: {
    icon: '/permanence-mark.svg',
    shortcut: '/permanence-mark.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${spectral.variable} ${jetBrainsMono.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
