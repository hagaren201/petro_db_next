import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { buildStreamGraph, getStream, streamOverview } from "@/lib/data"
import { StreamMap } from "@/components/StreamMap"

export function generateStaticParams() {
  return ["c2", "c3", "c4", "c5", "aromatics", "methanol"].map((stream) => ({ stream }))
}

export default async function StreamPage({ params }: { params: Promise<{ stream: string }> }) {
  const { stream: slug } = await params
  const stream = getStream(slug)
  if (!stream) notFound()
  const graph = buildStreamGraph(stream)
  const overview = streamOverview(stream)

  return (
    <main>
      <section className="page-head">
        <Link className="button" href="/"><ArrowLeft size={16} /> Streams</Link>
        <span className="eyebrow">{stream.key} value chain</span>
        <h1>{stream.label}</h1>
        <p className="lead">
          Lane-based downstream view from {stream.roots.join(", ")} into intermediates, monomers, polymers, and functional materials.
        </p>
      </section>

      <section className="grid">
        <div className="metric card"><strong>{overview.materialCount}</strong><span>materials in stream</span></div>
        <div className="metric card"><strong>{overview.routeCount}</strong><span>mapped production routes</span></div>
        <div className="metric card"><strong>{overview.supplierCount}</strong><span>domestic supplier records</span></div>
      </section>

      <section className="section">
        <StreamMap graph={graph} />
      </section>
    </main>
  )
}
