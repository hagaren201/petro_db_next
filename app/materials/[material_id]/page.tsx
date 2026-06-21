import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { formatNumber, getMaterial, getMaterialTrade, petroData } from "@/lib/data"
import { deployDb, type DeploySupplierSummary } from "@/lib/deployData"
import { TradeFlowChart } from "@/components/TradeFlowChart"

export function generateStaticParams() {
  return petroData.materials.map((material) => ({ material_id: material.id }))
}

export default async function MaterialPage({ params }: { params: Promise<{ material_id: string }> }) {
  const { material_id: materialId } = await params
  const material = getMaterial(materialId)
  if (!material) notFound()

  const materialCard = deployDb.material_card.find((card) => card.material_id === material.id)
  const supplierSummary = deployDb.supplier_summary.find((summary) => summary.material_id === material.id)
  const suppliers = sortedSupplierRows(supplierSummary)
  const trade = getMaterialTrade(material.id)
  const tradeSeries = deployDb.trade_series.find((series) => series.material_id === material.id)
  const licensors = petroData.outputLicensors[material.id] || []
  const productOverview = textOrNull(
    materialCard?.product_overview ?? materialCard?.detail_sections?.product_overview?.short ?? materialCard?.detail_sections?.product_overview?.raw
  )
  const productionProcess = textOrNull(
    materialCard?.production_process ?? materialCard?.detail_sections?.production_process?.short ?? materialCard?.detail_sections?.production_process?.raw
  )
  const strategicSnapshot = getStrategicSnapshot({
    materialId: material.id,
    supplierSummary,
    tradeStatus: textOrNull(materialCard?.trade_status) ?? textOrNull(trade[0]?.tradeStatus)
  })

  return (
    <main>
      <section className="page-head material-page-head">
        <Link className="button" href="/"><ArrowLeft size={16} /> Dashboard</Link>
        <span className="eyebrow">{material.category}</span>
        <h1>{material.name}</h1>
        <p className="lead">{[material.subtype, material.remarks].filter(Boolean).join(" / ")}</p>
      </section>

      <section className="detail-layout material-detail-layout">
        <div className="stack">
          <div className="panel material-panel stack">
            <h2>Overview</h2>
            <div className="overview-meta">
              {materialCard?.material_group || material.group ? <span>{materialCard?.material_group || material.group}</span> : null}
              {materialCard?.material_type || material.type ? <span>{materialCard?.material_type || material.type}</span> : null}
              {materialCard?.material_subtype || material.subtype ? <span>{materialCard?.material_subtype || material.subtype}</span> : null}
            </div>
            {productOverview || productionProcess ? (
              <div className="overview-grid">
                {productOverview ? <OverviewCard title="Product overview" text={productOverview} /> : null}
                {productionProcess ? <OverviewCard title="Production process" text={productionProcess} /> : null}
              </div>
            ) : (
              <p className="muted-copy">No overview available.</p>
            )}
          </div>

          <div className="panel material-panel stack">
            <h2>Strategic Snapshot</h2>
            <div className="snapshot-grid">
              {strategicSnapshot.map((item) => (
                <article className={`snapshot-card${item.isMuted ? " muted" : ""}`} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  {item.items?.length ? (
                    <ul>
                      {item.items.slice(0, 3).map((value) => <li key={value}>{value}</li>)}
                      {item.items.length > 3 ? <li className="more-list-item">+{item.items.length - 3} more</li> : null}
                    </ul>
                  ) : item.note ? <small>{item.note}</small> : null}
                </article>
              ))}
            </div>
          </div>

          <div className="panel material-panel stack">
            <h2>Chain Flow</h2>
            <ChainFlow
              current={{ id: material.id, name: material.name, subtype: material.subtype, type: material.type }}
              flow={getChainFlow(material.id)}
            />
          </div>

          {tradeSeries?.rows.length ? (
            <div className="panel material-panel stack">
              <h2>Trade Flow</h2>
              {trade.length ? (
                <div className="grid trade-metric-grid">
                  {trade.map((row) => (
                    <div className="metric compact-metric" key={row.hsk10}>
                      <strong>{row.tradeStatus}</strong>
                      <span>
                        Ex {formatNumber(row.exportLatest, 1)} / Im {formatNumber(row.importLatest, 1)} / Net {formatNumber(row.netLatest, 1)}
                      </span>
                      <span>{row.tradeRegime}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <TradeFlowChart series={tradeSeries} />
            </div>
          ) : null}
        </div>

        <aside className="stack">
          <div className="panel material-panel stack">
            <h2>Licensors</h2>
            {licensors.length ? (
              <div className="badge-list">{licensors.map((name) => <span className="badge" key={name}>{name}</span>)}</div>
            ) : (
              <p className="muted-copy">No licensor is mapped.</p>
            )}
          </div>

          <div className="panel material-panel stack">
            <h2>Domestic Suppliers</h2>
            {suppliers.length ? (
              <>
                <div className="supplier-total">
                  <span>Total capacity</span>
                  <strong>{formatCapacityKta(supplierSummary?.total_capacity ?? null, supplierSummary?.capacity_unit ?? "KTA")}</strong>
                </div>
                {suppliers.length <= 2 ? <SupplierCompactCards suppliers={suppliers} /> : <SupplierCapacityBars suppliers={suppliers} />}
              </>
            ) : (
              <p className="muted-copy">No supplier record is mapped.</p>
            )}
          </div>
        </aside>
      </section>
    </main>
  )
}

type ChainFlowData = {
  downstream: FlowItem[]
  upstream: FlowItem[]
}
type FlowItem = {
  context: string[]
  id: string
  licensors: string[]
  name: string
  routeName: string | null
  subtype: string
  type: string
}
type SnapshotItem = {
  isMuted?: boolean
  items?: string[]
  label: string
  note?: string
  value: string
}
type SupplierRow = DeploySupplierSummary["suppliers"][number]

function OverviewCard({ text, title }: { text: string; title: string }) {
  return (
    <article className="overview-card">
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  )
}

function ChainFlow({ current, flow }: { current: { id: string; name: string; subtype: string; type: string }; flow: ChainFlowData }) {
  return (
    <div className="chain-flow">
      <div className="flow-lane">
        <span className="flow-lane-title">Upstream</span>
        {flow.upstream.length ? flow.upstream.map((item) => <FlowNode item={item} key={`${item.id}-${item.routeName}`} />) : <p className="muted-copy">No upstream route is mapped.</p>}
      </div>
      <div className="flow-current">
        <span className="flow-lane-title">Current material</span>
        <Link className="flow-node current" href={`/materials/${current.id}`}>
          <strong>{current.name}</strong>
          <small>{[current.type, current.subtype].filter(Boolean).join(" / ")}</small>
        </Link>
      </div>
      <div className="flow-lane">
        <span className="flow-lane-title">Downstream</span>
        {flow.downstream.length ? flow.downstream.map((item) => <FlowNode item={item} key={`${item.id}-${item.routeName}`} />) : <p className="muted-copy">No downstream route is mapped.</p>}
      </div>
    </div>
  )
}

function FlowNode({ item }: { item: FlowItem }) {
  return (
    <Link className="flow-node" href={`/materials/${item.id}`}>
      <strong>{item.name}</strong>
      <small>{[item.type, item.subtype].filter(Boolean).join(" / ")}</small>
      {item.routeName ? <em>{item.routeName}</em> : null}
      {item.licensors.length ? <span>{item.licensors.join(", ")}</span> : <span className="muted-value">No licensor</span>}
      {item.context.length ? <small className="flow-context">Context: {item.context.join(" / ")}</small> : null}
    </Link>
  )
}

function SupplierCompactCards({ suppliers }: { suppliers: SupplierRow[] }) {
  return (
    <div className="supplier-card-list">
      {suppliers.map((supplier) => (
        <article className="supplier-mini-card" key={supplierKey(supplier)}>
          <strong>{supplier.supplier_name || "Unknown"}</strong>
          <span>{supplier.location || "-"} / {formatCapacityKta(supplier.estimated_capacity ?? null, supplier.capacity_unit)}</span>
        </article>
      ))}
    </div>
  )
}

function SupplierCapacityBars({ suppliers }: { suppliers: SupplierRow[] }) {
  const maxCapacity = Math.max(...suppliers.map((supplier) => supplier.estimated_capacity ?? 0))
  if (!maxCapacity) return null
  const visibleSuppliers = suppliers.slice(0, 8)
  const hiddenSuppliers = suppliers.slice(8)

  return (
    <div className="supplier-bars" aria-label="Supplier capacity by company and location">
      {visibleSuppliers.map((supplier) => <SupplierBarRow key={supplierKey(supplier)} maxCapacity={maxCapacity} supplier={supplier} />)}
      {hiddenSuppliers.length ? (
        <details className="supplier-more">
          <summary>Show more suppliers</summary>
          <div className="supplier-bars nested">
            {hiddenSuppliers.map((supplier) => <SupplierBarRow key={supplierKey(supplier)} maxCapacity={maxCapacity} supplier={supplier} />)}
          </div>
        </details>
      ) : null}
    </div>
  )
}

function SupplierBarRow({ maxCapacity, supplier }: { maxCapacity: number; supplier: SupplierRow }) {
  const capacity = supplier.estimated_capacity ?? 0
  return (
    <div className="supplier-bar-row">
      <span>
        <strong>{supplier.supplier_name || "Unknown"}</strong>
        <small>{supplier.location || "-"}</small>
      </span>
      <span className="supplier-bar-track">
        <span className="supplier-bar" style={{ width: `${(capacity / maxCapacity) * 100}%` }} />
      </span>
      <strong>{formatCapacityKta(capacity, supplier.capacity_unit)}</strong>
    </div>
  )
}

function getChainFlow(materialId: string): ChainFlowData {
  const upstream = deployDb.route_edges
    .filter((edge) => edge.target_material_id === materialId && edge.source_material_id)
    .map((edge) => flowItem(edge.source_material_id as string, edge.route_name, routeLicensors(edge.route_id), secondHop(edge.source_material_id as string, "upstream")))
    .filter((item): item is FlowItem => Boolean(item))
  const downstream = deployDb.route_edges
    .filter((edge) => edge.source_material_id === materialId && edge.target_material_id)
    .map((edge) => flowItem(edge.target_material_id as string, edge.route_name, routeLicensors(edge.route_id), secondHop(edge.target_material_id as string, "downstream")))
    .filter((item): item is FlowItem => Boolean(item))

  return {
    downstream: dedupeFlowItems(downstream),
    upstream: dedupeFlowItems(upstream)
  }
}

function flowItem(materialId: string, routeName: string | null, licensors: string[], context: string[]): FlowItem | null {
  const material = getMaterial(materialId)
  if (!material) return null
  return {
    context,
    id: material.id,
    licensors,
    name: material.name,
    routeName,
    subtype: material.subtype,
    type: material.type
  }
}

function routeLicensors(routeId: string | null) {
  if (!routeId) return []
  const edge = petroData.edges.find((item) => item.routeId === routeId)
  return edge?.licensors.map((licensor) => licensor.name) ?? []
}

function secondHop(materialId: string, direction: "downstream" | "upstream") {
  const ids = deployDb.route_edges
    .filter((edge) => direction === "upstream" ? edge.target_material_id === materialId : edge.source_material_id === materialId)
    .map((edge) => direction === "upstream" ? edge.source_material_id : edge.target_material_id)
    .filter((id): id is string => Boolean(id))
  return Array.from(new Set(ids.map((id) => getMaterial(id)?.name).filter((name): name is string => Boolean(name)))).slice(0, 3)
}

function dedupeFlowItems(items: FlowItem[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.id}-${item.routeName}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function getStrategicSnapshot({
  materialId,
  supplierSummary,
  tradeStatus
}: {
  materialId: string
  supplierSummary?: DeploySupplierSummary
  tradeStatus: string | null
}) {
  const materialCard = deployDb.material_card.find((card) => card.material_id === materialId)
  const applications = uniqueTexts([
    ...splitList(materialCard?.detail_sections?.main_application?.short ?? materialCard?.detail_sections?.main_application?.raw),
    ...deployDb.app_edges
      .filter((edge) => edge.material_id === materialId)
      .map((edge) => textOrNull(edge.application_taxonomy) ?? textOrNull(edge.raw_application))
  ])
  const endUses = uniqueTexts([
    ...splitList(materialCard?.detail_sections?.end_use_industry?.short ?? materialCard?.detail_sections?.end_use_industry?.raw),
    ...deployDb.app_edges
      .filter((edge) => edge.material_id === materialId)
      .map((edge) => textOrNull(edge.end_use_industry))
  ])
  const capacity = supplierSummary?.total_capacity

  return [
    {
      label: "Applications",
      value: applications.length ? `${applications.length} mapped` : "Unknown",
      items: applications,
      isMuted: !applications.length
    },
    {
      label: "End-use Industries",
      value: endUses.length ? `${endUses.length} mapped` : "Unknown",
      items: endUses,
      isMuted: !endUses.length
    },
    {
      label: "Domestic Capacity",
      value: capacity || capacity === 0 ? formatCapacityKta(capacity, supplierSummary?.capacity_unit ?? "KTA") : "Unknown",
      note: supplierSummary?.supplier_count ? `${supplierSummary.supplier_count} suppliers` : undefined,
      isMuted: capacity === null || capacity === undefined
    },
    {
      label: "Trade Status",
      value: tradeStatus || "Unknown",
      isMuted: !tradeStatus
    }
  ] satisfies SnapshotItem[]
}

function sortedSupplierRows(summary?: DeploySupplierSummary) {
  return [...(summary?.suppliers ?? [])].sort(
    (a, b) =>
      (b.estimated_capacity ?? 0) - (a.estimated_capacity ?? 0) ||
      (a.supplier_name || "").localeCompare(b.supplier_name || "") ||
      (a.location || "").localeCompare(b.location || "")
  )
}

function formatCapacityKta(value: number | null | undefined, unit: string | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-"
  return `${formatNumber(value, 0)} ${unit || "KTA"}`
}

function splitList(value: unknown) {
  const text = textOrNull(value)
  if (!text) return []
  return text.split(/[,;]\s*/).map((item) => item.trim()).filter(Boolean)
}

function textOrNull(value: unknown) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text && text.toLowerCase() !== "unknown" ? text : null
}

function uniqueTexts(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value) && value !== "0")))
}

function supplierKey(supplier: SupplierRow) {
  return `${supplier.supplier_id}-${supplier.supplier_name}-${supplier.location}-${supplier.estimated_capacity}`
}
