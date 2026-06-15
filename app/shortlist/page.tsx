import { ShortlistClient } from "@/components/ShortlistClient"
import { petroData } from "@/lib/data"

export default function ShortlistPage() {
  return (
    <main>
      <section className="page-head">
        <span className="eyebrow">Derivative screening</span>
        <h1>Shortlist products by licensor availability, trade position, supplier footprint, and priority bucket.</h1>
        <p className="lead">
          Priority logic is preserved from the Streamlit page: Axens/Lummus plus net import products rank highest, followed by
          licensable products with domestic supply or import exposure.
        </p>
      </section>
      <ShortlistClient rows={petroData.shortlist} />
    </main>
  )
}
