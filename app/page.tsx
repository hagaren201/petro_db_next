import Link from "next/link"
import type { CSSProperties } from "react"
import { ArrowRight, Factory, Network, Users } from "lucide-react"
import { petroData, streamOverview } from "@/lib/data"

export default function HomePage() {
  return (
    <main>
      <section className="page-head">
        <span className="eyebrow">Petrochemical downstream map</span>
        <h1>Explore value chains from base chemicals to derivatives, suppliers, licensors, and trade signals.</h1>
        <p className="lead">
          The Streamlit database has been rebuilt as a Vercel-ready analytical web app with clickable stream maps,
          material drill-downs, shortlist screening, and global search.
        </p>
      </section>

      <section className="grid">
        {petroData.streamDefs.map((stream) => {
          const overview = streamOverview(stream)
          return (
            <Link className="card stream-card" href={`/streams/${stream.slug}`} key={stream.slug} style={{ "--stream-color": stream.color } as CSSProperties}>
              <span className="stream-chip">{stream.label}</span>
              <h2>{stream.label}</h2>
              <div className="metrics">
                <div className="metric">
                  <strong><Factory size={18} /> {overview.materialCount}</strong>
                  <span>materials</span>
                </div>
                <div className="metric">
                  <strong><Network size={18} /> {overview.routeCount}</strong>
                  <span>routes</span>
                </div>
                <div className="metric">
                  <strong><Users size={18} /> {overview.supplierCount}</strong>
                  <span>suppliers</span>
                </div>
              </div>
              <div className="product-list">
                {overview.products.map((product) => <span className="badge" key={product}>{product}</span>)}
              </div>
              <span className="button">Open stream <ArrowRight size={16} /></span>
            </Link>
          )
        })}
      </section>
    </main>
  )
}
