import { ShortlistClient } from "@/components/ShortlistClient"
import { buildChainScreeningRows } from "@/lib/chainScreening"

export default function ShortlistPage() {
  const rows = buildChainScreeningRows()

  return (
    <main>
      <section className="page-head">
        <span className="eyebrow">Derivative screening</span>
        <h1>Derivative Chain Screening</h1>
        <p className="lead">Prioritize downstream value chains for deep-dive assessment based on aggregated material scores.</p>
      </section>
      <ShortlistClient rows={rows} />
    </main>
  )
}
