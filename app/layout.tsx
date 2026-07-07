import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import "./globals.css"

export const metadata: Metadata = {
  title: "Petrochemical Downstream DB",
  description: "Visual petrochemical downstream route, supplier, licensor, and trade database"
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
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
            <Link href="/shortlist">Screening</Link>
            <Link href="/search">Search</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  )
}
