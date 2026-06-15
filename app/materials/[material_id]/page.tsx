import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight } from "lucide-react"
import {
  downstreamEdges,
  formatCapacity,
  formatNumber,
  getMaterial,
  getMaterialTrade,
  getRawTradeForMaterial,
  petroData,
  upstreamEdges
} from "@/lib/data"
import { TradeBars } from "@/components/TradeBars"
import { TypeBadge } from "@/components/TypeBadge"

export function generateStaticParams() {
  return petroData.materials.map((material) => ({ material_id: material.id }))
}

export default async function MaterialPage({ params }: { params: Promise<{ material_id: string }> }) {
  const { material_id: materialId } = await params
  const material = getMaterial(materialId)
  if (!material) notFound()

  const upstream = upstreamEdges(material.id)
  const downstream = downstreamEdges(material.id)
  const suppliers = petroData.materialSuppliers[material.id] || []
  const supplierInfo = petroData.supplierInfoByMaterial[material.id]
  const trade = getMaterialTrade(material.id)
  const rawTrade = getRawTradeForMaterial(material.id)
  const licensors = petroData.outputLicensors[material.id] || []

  return (
    <main>
      <section className="page-head">
        <Link className="button" href="/"><ArrowLeft size={16} /> Dashboard</Link>
        <span className="eyebrow">{material.category}</span>
        <h1>{material.name}</h1>
        <p className="lead">{[material.group, material.type, material.subtype, material.remarks].filter(Boolean).join(" / ")}</p>
      </section>

      <section className="detail-layout">
        <div className="stack">
          <div className="panel stack">
            <h2>Material Master</h2>
            <div className="kv"><span>Material ID</span><strong>{material.id}</strong></div>
            <div className="kv"><span>Group</span><span>{material.group}</span></div>
            <div className="kv"><span>Type</span><span><TypeBadge type={material.type} /> {material.subtype}</span></div>
            <div className="kv"><span>HSK10</span><span>{material.hsk10 || "-"}</span></div>
            <div className="kv"><span>Flags</span><span>{material.ccma ? "CCMA " : ""}{material.ceh ? "CEH " : ""}{material.isUlsanFlag ? "Ulsan" : "" || "-"}</span></div>
          </div>

          <div className="panel stack">
            <h2>Upstream Routes</h2>
            {upstream.length ? upstream.map((edge) => (
              <RouteLine edge={edge} direction="from" key={`${edge.routeId}-${edge.src}`} />
            )) : <p className="lead">No upstream route is mapped.</p>}
          </div>

          <div className="panel stack">
            <h2>Downstream Routes</h2>
            {downstream.length ? downstream.map((edge) => (
              <RouteLine edge={edge} direction="to" key={`${edge.routeId}-${edge.dst}`} />
            )) : <p className="lead">No downstream route is mapped.</p>}
          </div>

          <div className="panel stack">
            <h2>Trade Flow</h2>
            <div className="grid">
              {trade.length ? trade.map((row) => (
                <div className="metric" key={row.hsk10}>
                  <strong>{row.tradeStatus}</strong>
                  <span>{row.hsk10} / {row.tradeRegime} / net {formatNumber(row.netLatest, 1)}</span>
                </div>
              )) : <div className="empty">No mapped HSK trade summary.</div>}
            </div>
            <TradeBars rows={rawTrade} />
          </div>
        </div>

        <aside className="stack">
          <div className="panel stack">
            <h2>Licensors</h2>
            {licensors.length ? licensors.map((name) => <span className="badge" key={name}>{name}</span>) : <p className="lead">No licensor is mapped to output routes.</p>}
          </div>

          <div className="panel stack">
            <h2>Domestic Suppliers</h2>
            <div className="kv"><span>Total capacity</span><strong>{formatCapacity(material.id)}</strong></div>
            <div className="kv"><span>Locations</span><span>{supplierInfo?.locations?.join(", ") || "-"}</span></div>
            {suppliers.length ? suppliers.map((supplier) => (
              <div className="metric" key={`${supplier.supplierId}-${supplier.location}-${supplier.estimatedCapacity}`}>
                <strong>{supplier.supplierName}</strong>
                <span>{supplier.location || "-"} / {supplier.estimatedCapacity || "-"} {supplier.capacityUnit}</span>
              </div>
            )) : <p className="lead">No supplier record is mapped.</p>}
          </div>
        </aside>
      </section>
    </main>
  )
}

function RouteLine({ edge, direction }: { edge: (typeof petroData.edges)[number]; direction: "from" | "to" }) {
  const peer = getMaterial(direction === "from" ? edge.src : edge.dst)
  return (
    <Link className="route-chip" href={`/materials/${peer?.id || ""}`}>
      <span>{edge.routeName}</span>
      <span>
        {direction} {peer?.name || "-"} <ArrowRight size={13} />
      </span>
      <span>{edge.licensors.map((licensor) => licensor.name).join(", ") || "No licensor"}</span>
    </Link>
  )
}
