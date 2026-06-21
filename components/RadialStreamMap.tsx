"use client"

import Link from "next/link"
import type { CSSProperties } from "react"
import { useMemo, useState } from "react"
import { ArrowRight, CircleDot, GitBranch, Info, RotateCcw } from "lucide-react"
import type { GraphNode, StreamGraph } from "@/lib/data"
import { deployDb, type DeployAppEdge, type DeployChainMaterialMap, type DeployMaterialCard } from "@/lib/deployData"
import type { Material } from "@/lib/types"
import { TypeBadge } from "./TypeBadge"

const maxProductsPerChain = 7
const maxFocusMaterials = 8
const centerCoord = 50
const roundCoord = (value: number) => Number(value.toFixed(4))
const coordPercent = (value: number) => `${roundCoord(value)}%`

const representativeProductsByChain: Record<string, string[]> = {
  "pe-chain": ["HDPE", "LDPE", "LLDPE"],
  "eo-pet-chain": ["EO", "MEG", "PET"],
  "pvc-chain": ["EDC", "VCM", "PVC"],
  "oxo-alcohol-chain": ["Ethanol", "2-Ethylhexanol"],
  "vam-chain": ["VAM", "EVA", "PVA"],
  polyolefin: ["HDPE", "LDPE", "LLDPE"],
  "eo-eg": ["EO", "MEG", "PET"],
  pvc: ["EDC", "VCM", "PVC"],
  acetate: ["VAM", "EVA", "PVA"]
}

const chainColors = ["#6f63b6", "#358f86", "#3d7dcc", "#d68636", "#d95f68", "#697686", "#7b8f4f", "#9a6b53"]
const streamChainAllowlist: Record<string, Set<string>> = {
  Propylene: new Set(["PP Chain", "PO/PG Chain", "PU Chain", "AA-SAP Chain", "Acrylic Ester Chain", "Oxo Alcohol Chain", "IPA Chain", "UPR Platform"])
}

export function RadialStreamMap({ graph, initialGroupId }: { graph: StreamGraph; initialGroupId?: string }) {
  const roots = graph.nodes.filter((node) => node.depth === 0)
  const feedstock = roots[0]
  const [selectedChainId, setSelectedChainId] = useState<string | null>(initialGroupId ?? null)
  const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set())
  const [showAllProducts, setShowAllProducts] = useState(false)
  const [showAllChains, setShowAllChains] = useState(false)
  const chains = useMemo(() => buildMapChains(graph), [graph])
  const selectedChain = chains.find((chain) => chain.id === selectedChainId) ?? null
  const defaultChains = chains.filter((chain) => chain.isDefaultVisible)
  const visibleChains = showAllChains || !defaultChains.length ? chains : defaultChains
  const extraChainCount = Math.max(0, chains.length - defaultChains.length)

  function selectChain(chainId: string) {
    setSelectedChainId(chainId)
  }

  function resetView() {
    setSelectedChainId(null)
    setExpandedChains(new Set())
  }

  function expandChain(chainId: string) {
    setExpandedChains((current) => new Set(current).add(chainId))
  }

  return (
    <div className="radial-layout">
      <aside className="radial-panel chain-panel">
        <div className="chain-panel-head">
          <span className="eyebrow">Chains ({visibleChains.length}/{chains.length})</span>
          {selectedChain ? (
            <button className="reset-view-button" onClick={resetView} type="button">
              <RotateCcw size={14} />
              Reset view
            </button>
          ) : null}
        </div>
        <div className="chain-card-list">
          {visibleChains.map((chain) => (
            <button
              className={`chain-card ${selectedChainId === chain.id ? "active" : ""} ${selectedChainId !== null && selectedChainId !== chain.id ? "dimmed" : ""}`}
              key={chain.id}
              onClick={() => selectChain(chain.id)}
              style={{ "--chain-color": chain.color } as CustomProperties}
              type="button"
            >
              <span>
                <strong>{chain.label}</strong>
                <small>
                  <span className="chain-badge">{chain.classification}</span>
                  {chain.materialCount} materials
                </small>
              </span>
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
        {extraChainCount ? (
          <button className="more-chains-pill" onClick={() => setShowAllChains((value) => !value)} type="button">
            {showAllChains ? "Show default only" : `+${extraChainCount} more chains`}
          </button>
        ) : null}
      </aside>

      <section className="radial-stage" aria-label={`${graph.stream.label} radial downstream map`}>
        <div className="map-actions">
          {selectedChain ? (
            <button className="reset-view-button" onClick={resetView} type="button">
              <RotateCcw size={14} />
              Reset view
            </button>
          ) : null}
          <label className="show-all-toggle">
            <input checked={showAllProducts} onChange={(event) => setShowAllProducts(event.target.checked)} type="checkbox" />
            Show all products
          </label>
        </div>

        {selectedChain ? (
          <FocusedChainMap
            chain={selectedChain}
            expanded={expandedChains.has(selectedChain.id)}
            onExpand={() => expandChain(selectedChain.id)}
            showAllProducts={showAllProducts}
          />
        ) : (
          <>
            {feedstock ? <FeedstockNode node={feedstock} /> : null}
            {visibleChains.map((chain, index) => (
              <ChainCluster
                chain={chain}
                index={index}
                key={chain.id}
                onSelect={() => selectChain(chain.id)}
                showAllProducts={showAllProducts}
                total={visibleChains.length}
              />
            ))}
            {extraChainCount ? (
              <button className="more-chains-stage-pill" onClick={() => setShowAllChains((value) => !value)} type="button">
                {showAllChains ? "Show default only" : `+${extraChainCount} more chains`}
              </button>
            ) : null}
          </>
        )}
      </section>

      <aside className="radial-panel map-info-panel">
        {selectedChain ? <SelectedChainPanel chain={selectedChain} /> : <OverviewPanel />}
      </aside>
    </div>
  )
}

type MapMaterial = {
  id: string
  material: Material
  card?: DeployMaterialCard
  mapRow?: DeployChainMaterialMap
  role: "upstream" | "core" | "downstream"
  depth: number
  displayOrder: number | null
  isKey: boolean
}

type MapChain = {
  id: string
  label: string
  classification: string
  color: string
  materialCount: number
  groupScore: number | null
  isDefaultVisible: boolean
  displayOrder: number
  avgEndUseAtt: number | null
  maxEndUseAtt: number | null
  materials: MapMaterial[]
  representativeMaterials: MapMaterial[]
  hiddenCount: number
  applications: DeployAppEdge[]
}

function ChainCluster({
  chain,
  index,
  onSelect,
  showAllProducts,
  total
}: {
  chain: MapChain
  index: number
  onSelect: () => void
  showAllProducts: boolean
  total: number
}) {
  const chainRadius = 30
  const productRadius = 16
  const chainSize = scoreToNodeSize(chain.groupScore)
  const angle = -Math.PI / 2 + (index / Math.max(total, 1)) * Math.PI * 2
  const visibleProducts = showAllProducts ? chain.materials : chain.representativeMaterials
  const hiddenCount = Math.max(0, chain.materials.length - visibleProducts.length)
  const x = roundCoord(centerCoord + Math.cos(angle) * chainRadius)
  const y = roundCoord(centerCoord + Math.sin(angle) * chainRadius)
  const productAngles = productSpread(angle, visibleProducts.length)
  const moreX = roundCoord(centerCoord + Math.cos(angle) * (chainRadius + 15))
  const moreY = roundCoord(centerCoord + Math.sin(angle) * (chainRadius + 15))
  const productPositions = visibleProducts.map((_, productIndex) => ({
    x: roundCoord(centerCoord + Math.cos(productAngles[productIndex]) * productRadius + Math.cos(angle) * chainRadius),
    y: roundCoord(centerCoord + Math.sin(productAngles[productIndex]) * productRadius + Math.sin(angle) * chainRadius)
  }))

  return (
    <div className="radial-chain active" style={{ "--chain-color": chain.color } as CustomProperties}>
      <svg className="radial-connector" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1={centerCoord} y1={centerCoord} x2={x} y2={y} />
        {visibleProducts.map((product, productIndex) => {
          const productPosition = productPositions[productIndex]
          return <line key={product.id} x1={x} y1={y} x2={productPosition.x} y2={productPosition.y} />
        })}
      </svg>
      <button
        className="chain-node"
        onClick={onSelect}
        style={{ "--chain-size": `${chainSize}px`, left: coordPercent(x), top: coordPercent(y) } as CustomProperties}
        type="button"
      >
        <GitBranch size={20} />
        <strong>{chain.label}</strong>
        <span>{chain.classification}</span>
      </button>
      {visibleProducts.map((product, productIndex) => {
        const productPosition = productPositions[productIndex]
        return <ProductNode key={product.id} product={product} style={{ left: coordPercent(productPosition.x), top: coordPercent(productPosition.y) }} />
      })}
      {hiddenCount ? (
        <button className="more-node" onClick={onSelect} style={{ left: coordPercent(moreX), top: coordPercent(moreY) }} type="button">
          +{hiddenCount} more
        </button>
      ) : null}
    </div>
  )
}

function FocusedChainMap({
  chain,
  expanded,
  onExpand,
  showAllProducts
}: {
  chain: MapChain
  expanded: boolean
  onExpand: () => void
  showAllProducts: boolean
}) {
  const visibleMaterials = showAllProducts || expanded ? chain.materials : chain.materials.slice(0, maxFocusMaterials)
  const hiddenCount = Math.max(0, chain.materials.length - visibleMaterials.length)
  const positions = spiderPositions(visibleMaterials)

  return (
    <div className="focus-map" style={{ "--chain-color": chain.color } as CustomProperties}>
      <svg className="radial-connector focus-connector" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {visibleMaterials.map((material, index) => {
          const position = positions[index]
          return <line key={material.id} x1={centerCoord} y1={centerCoord} x2={position.x} y2={position.y} />
        })}
      </svg>
      <div className="focus-chain-node" style={{ "--chain-size": `${scoreToNodeSize(chain.groupScore) + 32}px` } as CustomProperties}>
        <GitBranch size={24} />
        <strong>{chain.label}</strong>
        <span>{chain.classification}</span>
      </div>
      {visibleMaterials.map((material, index) => {
        const position = positions[index]
        return (
          <ProductNode
            className={`focus-product-node role-${material.role} ${material.isKey ? "key-material" : ""}`}
            key={material.id}
            product={material}
            style={{ left: coordPercent(position.x), top: coordPercent(position.y) }}
          />
        )
      })}
      {hiddenCount ? (
        <button className="more-node focus-more-node" onClick={onExpand} style={{ left: coordPercent(centerCoord), top: coordPercent(89) }} type="button">
          +{hiddenCount} more materials
        </button>
      ) : null}
    </div>
  )
}

function ProductNode({ className = "", product, style }: { className?: string; product: MapMaterial; style: CSSProperties }) {
  return (
    <Link
      className={`product-node ${className}`}
      href={`/materials/${product.id}`}
      style={style}
      title={[product.material.type, product.material.subtype].filter(Boolean).join(" / ")}
    >
      <span className="product-dot"><CircleDot size={14} /></span>
      <strong>{product.material.name}</strong>
      <small>{product.material.subtype || product.material.type || roleLabel(product.role)}</small>
    </Link>
  )
}

function FeedstockNode({ node }: { node: GraphNode }) {
  return (
    <Link className="feedstock-node" href={`/materials/${node.id}`}>
      <span className="feedstock-symbol">C=C</span>
      <strong>{node.name}</strong>
      <TypeBadge type={node.type} />
    </Link>
  )
}

function SelectedChainPanel({ chain }: { chain: MapChain }) {
  const keyMaterials = chain.materials.filter((material) => material.isKey).slice(0, 6)
  const fallbackMaterials = chain.materials.slice(0, 6)
  const applications = summarizeApplications(chain.applications)

  return (
    <>
      <div className="info-card selected-chain-summary" style={{ "--chain-color": chain.color } as CustomProperties}>
        <h3><GitBranch size={15} /> {chain.label}</h3>
        <p>{chain.classification} chain with {chain.materialCount} mapped materials in the current stream context.</p>
        <div className="summary-stat">
          <span>Materials</span>
          <strong>{chain.materialCount}</strong>
        </div>
        <div className="metric-grid">
          <span>
            <small>Group score</small>
            <strong>{formatMetric(chain.groupScore)}</strong>
          </span>
          <span>
            <small>Avg end-use</small>
            <strong>{formatMetric(chain.avgEndUseAtt, 2)}</strong>
          </span>
          <span>
            <small>Max end-use</small>
            <strong>{formatMetric(chain.maxEndUseAtt, 2)}</strong>
          </span>
        </div>
      </div>
      <div className="info-card">
        <h3>Key Materials</h3>
        <div className="summary-pill-list">
          {(keyMaterials.length ? keyMaterials : fallbackMaterials).map((material) => (
            <Link href={`/materials/${material.id}`} key={material.id}>
              {material.material.name}
            </Link>
          ))}
        </div>
      </div>
      <div className="info-card">
        <h3>Related Applications</h3>
        {applications.length ? (
          <div className="application-list">
            {applications.map((application) => (
              <span key={application}>{application}</span>
            ))}
          </div>
        ) : (
          <p>No application mapping is available for this chain yet.</p>
        )}
      </div>
      <div className="info-card legend-card">
        <h3>Focus Legend</h3>
        <span><span className="legend-dot role-upstream" /> Upstream</span>
        <span><span className="legend-dot role-core" /> Core</span>
        <span><span className="legend-dot role-downstream" /> Downstream</span>
      </div>
    </>
  )
}

function OverviewPanel() {
  return (
    <>
      <div className="info-card">
        <h3><Info size={15} /> About this map</h3>
        <p>Chain-first radial view of downstream groups. Click a chain card or chain node to focus the map around that chain.</p>
      </div>
      <div className="info-card legend-card">
        <h3>Legend</h3>
        <span><GitBranch size={14} /> Chain node</span>
        <span><CircleDot size={14} /> Product node</span>
        <span><span className="legend-dot muted" /> Hidden products</span>
        <span><ArrowRight size={14} /> Direction</span>
      </div>
    </>
  )
}

function buildMapChains(graph: StreamGraph): MapChain[] {
  const graphMaterials = new Map<string, Material>(graph.nodes.map((node) => [node.id, node]))
  const cardsById = new Map(deployDb.material_card.map((card) => [card.material_id, card]).filter(([id]) => id) as [string, DeployMaterialCard][])
  const graphIds = new Set(graph.nodes.map((node) => node.id))
  const streamCards = deployDb.material_card.filter((card) => card.material_id && (card.material_group === graph.stream.category || graphIds.has(card.material_id)))
  const streamIds = new Set(streamCards.map((card) => card.material_id).filter(Boolean) as string[])
  const currentStream = graph.stream.category
  const depthById = new Map(graph.nodes.map((node) => [node.id, node.depth]))
  const routeDepthById = routeDepthFallback(graph)

  return deployDb.chain_master
    .map((chain, index) => {
      if (!isChainInCurrentStream(chain.stream, chain.group_name, currentStream)) return null
      const rows = deployDb.chain_material_map.filter((row) => row.group_id === chain.group_id && row.material_id && streamIds.has(row.material_id))
      const seen = new Set<string>()
      const materials = rows
        .filter((row) => {
          if (!row.material_id || seen.has(row.material_id)) return false
          seen.add(row.material_id)
          return true
        })
        .map((row) => {
          const card = row.material_id ? cardsById.get(row.material_id) : undefined
          const material = materialFromSources(row.material_id, graphMaterials, card)
          if (!material) return null
          return toMapMaterial(row, material, card, depthById, routeDepthById, chain.group_name)
        })
        .filter(Boolean) as MapMaterial[]

      if (!materials.length) return null
      const sortedMaterials = materials.sort(sortMapMaterial)
      const chainSlug = slugify(chain.group_name || chain.group_id || `chain-${index}`)
      const representativeMaterials = pickRepresentativeMaterials(chainSlug, sortedMaterials)
      const materialIds = new Set(sortedMaterials.map((material) => material.id))
      const applications = deployDb.app_edges.filter((edge) => edge.material_id && materialIds.has(edge.material_id))

      return {
        id: chain.group_id || chainSlug,
        label: chain.group_name || chain.group_id || `Chain ${index + 1}`,
        classification: classifyChain(chain.group_name, sortedMaterials),
        color: chainColors[index % chainColors.length],
        materialCount: chain.material_count,
        groupScore: chain.group_score,
        isDefaultVisible: chain.is_default_visible === true,
        displayOrder: chain.display_order ?? index + 1000,
        avgEndUseAtt: chain.avg_end_use_att,
        maxEndUseAtt: chain.max_end_use_att,
        materials: sortedMaterials,
        representativeMaterials,
        hiddenCount: Math.max(0, sortedMaterials.length - representativeMaterials.length),
        applications
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a?.displayOrder ?? 9999) - (b?.displayOrder ?? 9999) || (a?.label ?? "").localeCompare(b?.label ?? "")) as MapChain[]
}

function isChainInCurrentStream(stream: string | null, groupName: string | null, currentStream: string) {
  if (stream !== currentStream) return false
  const allowlist = streamChainAllowlist[currentStream]
  if (!allowlist) return true
  return groupName !== null && allowlist.has(groupName)
}

function toMapMaterial(
  row: DeployChainMaterialMap,
  material: Material,
  card: DeployMaterialCard | undefined,
  depthById: Map<string, number>,
  routeDepthById: Map<string, number>,
  chainName: string | null
): MapMaterial {
  const fallbackDepth = depthById.get(material.id) ?? routeDepthById.get(material.id) ?? 2
  const depth = row.depth ?? fallbackDepth
  const role = normalizeRole(row.material_role) ?? inferRole(material, depth, chainName)
  const displayOrder = row.display_order ?? null

  return {
    id: material.id,
    material,
    card,
    mapRow: row,
    role,
    depth,
    displayOrder,
    isKey: row.is_key_material ?? isLikelyKeyMaterial(material, row, chainName, depth)
  }
}

function materialFromSources(id: string | null, graphMaterials: Map<string, Material>, card?: DeployMaterialCard) {
  if (!id) return null
  const graphMaterial = graphMaterials.get(id)
  if (graphMaterial) return graphMaterial
  if (!card?.material_id || !card.material_name) return null
  return {
    id: card.material_id,
    group: card.material_group || "",
    category: card.material_group || "",
    name: card.material_name,
    type: card.material_type || "Other",
    subtype: card.material_subtype || "",
    verticalOrder: card.vertical_order ?? 99999,
    hsk10: card.hsk10 ? String(card.hsk10) : "",
    remarks: card.remarks || "",
    visualExclude: Boolean(card.visual_exclude),
    ccma: Boolean(card.ccma_snp),
    ceh: Boolean(card.ceh_ceh),
    hasSupplierFlag: Boolean(card.has_supplier),
    isUlsanFlag: Boolean(card.is_ulsan)
  }
}

function routeDepthFallback(graph: StreamGraph) {
  const rootIds = new Set(graph.nodes.filter((node) => node.depth === 0).map((node) => node.id))
  const depths = new Map<string, number>()
  for (const id of rootIds) depths.set(id, 0)
  for (const edge of graph.edges) {
    if (rootIds.has(edge.src)) depths.set(edge.dst, Math.min(depths.get(edge.dst) ?? 99, 1))
    else if (depths.has(edge.src)) depths.set(edge.dst, Math.min(depths.get(edge.dst) ?? 99, (depths.get(edge.src) ?? 1) + 1))
  }
  return depths
}

function pickRepresentativeMaterials(chainId: string, materials: MapMaterial[]) {
  const representativeNames = representativeProductsByChain[chainId]
  if (representativeNames?.length) {
    const byName = materials.filter((material) => representativeNames.includes(material.material.name))
    if (byName.length) return byName.slice(0, 3)
  }
  const keyMaterials = materials.filter((material) => material.isKey).slice(0, 3)
  return keyMaterials.length ? keyMaterials : materials.slice(0, 3)
}

function sortMapMaterial(a: MapMaterial, b: MapMaterial) {
  const aOrder = a.displayOrder
  const bOrder = b.displayOrder
  if (aOrder !== null && bOrder !== null && aOrder !== bOrder) return aOrder - bOrder
  if (aOrder !== null && bOrder === null) return -1
  if (aOrder === null && bOrder !== null) return 1
  return a.id.localeCompare(b.id)
}

function isLikelyKeyMaterial(material: Material, row: DeployChainMaterialMap, chainName: string | null, depth: number) {
  const normalizedChain = slugify(chainName || "")
  const representativeNames = representativeProductsByChain[normalizedChain] ?? []
  return representativeNames.includes(material.name) || depth <= 1 || row.end_use_att !== null || material.type === "Polymer"
}

function normalizeRole(role?: string | null): MapMaterial["role"] | null {
  const normalized = role?.toLowerCase().trim()
  if (!normalized) return null
  if (normalized.includes("upstream") || normalized.includes("feed")) return "upstream"
  if (normalized.includes("core") || normalized.includes("primary")) return "core"
  if (normalized.includes("downstream") || normalized.includes("derivative")) return "downstream"
  return null
}

function inferRole(material: Material, depth: number, chainName: string | null): MapMaterial["role"] {
  const name = `${chainName || ""} ${material.name} ${material.type}`.toLowerCase()
  if (depth <= 0 || name.includes("feedstock")) return "upstream"
  if (depth <= 1 || name.includes("monomer") || name.includes("intermediate")) return "core"
  return "downstream"
}

function classifyChain(chainName: string | null, materials: MapMaterial[]) {
  const name = chainName?.toLowerCase() || ""
  if (/(pe|pp|pvc|pet|rubber)/.test(name)) return "High Volume"
  if (/(eo|eg|pu|eva|battery|recycling)/.test(name)) return "High Growth"
  if (/(oxo|amine|ester|specialty)/.test(name)) return "Specialty"
  if (materials.length <= 2) return "Niche"
  return "Mature"
}

function summarizeApplications(applications: DeployAppEdge[]) {
  const scored = new Map<string, number>()
  for (const app of applications) {
    const label = app.application_taxonomy || app.end_use_industry || app.raw_application
    if (!label) continue
    scored.set(label, Math.max(scored.get(label) ?? 0, app.rating ?? 0))
  }
  return Array.from(scored.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 7)
    .map(([label]) => label)
}

function scoreToNodeSize(score: number | null) {
  if (score === null) return 124
  const clamped = Math.max(0, Math.min(100, score))
  return roundCoord(112 + (clamped / 100) * 30)
}

function formatMetric(value: number | null, digits = 0) {
  if (value === null || Number.isNaN(value)) return "-"
  return value.toFixed(digits)
}

function spiderPositions(materials: MapMaterial[]) {
  const roleOrder: MapMaterial["role"][] = ["upstream", "core", "downstream"]
  const arcs: Record<MapMaterial["role"], { start: number; end: number; radius: number }> = {
    upstream: { start: 210, end: 315, radius: 28 },
    core: { start: -60, end: 70, radius: 30 },
    downstream: { start: 90, end: 200, radius: 36 }
  }
  const byRole = new Map<MapMaterial["role"], MapMaterial[]>()
  for (const role of roleOrder) byRole.set(role, [])
  for (const material of materials) byRole.get(material.role)?.push(material)

  const positions = new Map<string, { x: number; y: number }>()
  for (const role of roleOrder) {
    const group = byRole.get(role) ?? []
    const arc = arcs[role]
    const angles = spreadDegrees(arc.start, arc.end, group.length)
    group.forEach((material, index) => {
      const radians = (angles[index] * Math.PI) / 180
      positions.set(material.id, {
        x: roundCoord(centerCoord + Math.cos(radians) * arc.radius),
        y: roundCoord(centerCoord + Math.sin(radians) * arc.radius)
      })
    })
  }

  return materials.map((material, index) => positions.get(material.id) ?? fallbackCircle(index, materials.length))
}

function fallbackCircle(index: number, total: number) {
  const angle = -Math.PI / 2 + (index / Math.max(total, 1)) * Math.PI * 2
  return {
    x: roundCoord(centerCoord + Math.cos(angle) * 34),
    y: roundCoord(centerCoord + Math.sin(angle) * 34)
  }
}

function spreadDegrees(start: number, end: number, count: number) {
  if (count <= 0) return []
  if (count === 1) return [(start + end) / 2]
  return Array.from({ length: count }, (_, index) => start + ((end - start) * index) / (count - 1))
}

function productSpread(chainAngle: number, count: number) {
  if (count <= 1) return [chainAngle]
  const arc = Math.PI * 0.72
  return Array.from({ length: count }, (_, index) => chainAngle - arc / 2 + (arc * index) / (count - 1))
}

function roleLabel(role: MapMaterial["role"]) {
  if (role === "upstream") return "Upstream"
  if (role === "core") return "Core"
  return "Downstream"
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

type CustomProperties = CSSProperties & Record<`--${string}`, string>
