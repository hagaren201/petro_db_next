import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"
import { buildStreamGraph, getStream } from "@/lib/data"
import { buildStreamTree } from "@/lib/tree"
import { StreamViews } from "@/components/StreamViews"

export function generateStaticParams() {
  return ["c2", "c3", "c4", "c5", "aromatics", "methanol"].map((stream) => ({ stream }))
}

export default async function StreamPage({ params }: { params: Promise<{ stream: string }> }) {
  const { stream: slug } = await params
  const stream = getStream(slug)
  if (!stream) notFound()
  const graph = buildStreamGraph(stream)
  const treeGroups = buildStreamTree(graph)

  return (
    <main className="stream-page">
      <section className="page-head stream-head">
        <Link className="button" href="/"><ArrowLeft size={16} /> Streams</Link>
        <span className="eyebrow">{stream.key} value chain</span>
        <h1>{stream.label}</h1>
        <p className="lead">Downstream value chain map</p>
      </section>

      <section className="section">
        <Suspense fallback={<div className="muted-copy">Loading map...</div>}>
          <StreamViews graph={graph} treeGroups={treeGroups} />
        </Suspense>
      </section>
    </main>
  )
}
