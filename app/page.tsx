import Link from "next/link"
import type { CSSProperties } from "react"
import { ArrowRight } from "lucide-react"
import { petroData } from "@/lib/data"

export default function HomePage() {
  return (
    <main className="landing-page">
      <section className="page-head landing-head">
        <span className="eyebrow">Petrochemical downstream map</span>
      </section>

      <section className="stream-selector">
        {petroData.streamDefs.map((stream) => (
          <Link className="card stream-card" href={`/streams/${stream.slug}`} key={stream.slug} style={{ "--stream-color": stream.color } as CustomProperties}>
            <span className="stream-card-accent" />
            <h2>{stream.key}</h2>
            <span className="button">Open stream <ArrowRight size={16} /></span>
          </Link>
        ))}
      </section>
    </main>
  )
}

type CustomProperties = CSSProperties & Record<`--${string}`, string>
