import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Geist, Geist_Mono } from "next/font/google"
import Link from "next/link"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
})

export const metadata: Metadata = {
  title: "Petrochemical Downstream DB",
  description: "Visual petrochemical downstream route, supplier, licensor, and trade database"
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <header className="topbar">
          <Link className="brand" href="/">
            <span className="brand-mark">P</span>
            <span>
              <strong>Petro DB</strong>
              <small>Downstream intelligence</small>
            </span>
          </Link>
          <nav>
            <Link href="/">Streams</Link>
            <Link href="/shortlist">Shortlist</Link>
            <Link href="/search">Search</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  )
}
