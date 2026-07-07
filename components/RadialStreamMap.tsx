"use client"

import Link from "next/link"
import type { CSSProperties } from "react"
import { useMemo, useState } from "react"
import { ArrowRight, GitBranch, Info, RotateCcw } from "lucide-react"
import type { StreamGraph } from "@/lib/data"
import { deployDb, type DeployAppEdge, type DeployChainMaterialMap, type DeployMaterialCard, type DeployRouteEdge } from "@/lib/deployData"
import type { Material } from "@/lib/types"
import { TypeBadge } from "./TypeBadge"

const centerCoord = 50
const rootY = 24
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

export function RadialStreamMap({ graph, initialGroupId }: { graph: StreamGraph; initialGroupId?: string }) {
  const [selectedChainId, setSelectedChainId] = useState<string | null>(initialGroupId ?? null)
  const [showAllProducts, setShowAllProducts] = useState(false)
  const [showAllChains, setShowAllChains] = useState(false)
  const rootMaterials = useMemo(() => getRootMaterialsByStream(graph), [graph])
  const chains = useMemo(() => buildMapChains(graph, rootMaterials), [graph, rootMaterials])
  const selectedChain = chains.find((chain) => chain.id === selectedChainId || chain.groupId === selectedChainId) ?? null
  const defaultChains = chains.filter((chain) => chain.isDefaultVisible)
  const visibleChains = showAllProducts || showAllChains || !defaultChains.length ? chains : defaultChains
  const sidebarChains = uniqueChainsByGroup(visibleChains)
  const allSidebarChains = uniqueChainsByGroup(chains)
  const defaultSidebarChains = uniqueChainsByGroup(defaultChains)
  const extraChainCount = Math.max(0, allSidebarChains.length - defaultSidebarChains.length)
  const rootPositions = useMemo(() => rootMaterials.map((root, index) => ({ id: root.id, position: rootPosition(index, rootMaterials.length) })), [rootMaterials])
  const rootPositionById = new Map(rootPositions.map((item) => [item.id, item.position]))
  const visibleChainsByRoot = groupChainsByRoot(visibleChains, rootMaterials)

  function selectChain(chainId: string) {
    setSelectedChainId(chainId)
  }

  function resetView() {
    setSelectedChainId(null)
  }

  function toggleChainVisibility() {
    if (showAllChains || showAllProducts) {
      setShowAllChains(false)
      setShowAllProducts(false)
      return
    }
    setShowAllChains(true)
  }

  return (
    <div className="radial-layout">
      <aside className="radial-panel chain-panel">
        <div className="chain-panel-head">
          <span className="eyebrow">Chains ({sidebarChains.length}/{allSidebarChains.length})</span>
          {selectedChain ? (
            <button className="reset-view-button" onClick={resetView} type="button">
              <RotateCcw size={14} />
              Reset view
            </button>
          ) : null}
        </div>
        <div className="chain-card-list">
          {sidebarChains.map((chain) => (
            <button
              className={`chain-card ${selectedChain && selectedChain.groupId === chain.groupId ? "active" : ""} ${selectedChain !== null && selectedChain.groupId !== chain.groupId ? "dimmed" : ""}`}
              key={chain.id}
              onClick={() => selectChain(chain.groupId)}
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
          <button className="more-chains-pill" onClick={toggleChainVisibility} type="button">
            {showAllChains || showAllProducts ? "Show default only" : `+${extraChainCount} more chains`}
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
            streamRootMaterials={rootMaterials}
          />
        ) : (
          <>
            {rootMaterials.map((root) => (
              <FeedstockNode key={root.id} node={root} position={rootPositionById.get(root.id) ?? { x: centerCoord, y: rootY }} />
            ))}
            {rootMaterials.map((root) => {
              const rootChains = visibleChainsByRoot.get(root.id) ?? []
              const position = rootPositionById.get(root.id) ?? { x: centerCoord, y: rootY }
              return rootChains.map((chain, index) => (
                <ChainCluster
                  chain={chain}
                  index={index}
                  key={chain.id}
                  onSelect={() => selectChain(chain.groupId)}
                  rootPosition={position}
                  total={rootChains.length}
                />
              ))
            })}
            {extraChainCount ? (
              <button className="more-chains-stage-pill" onClick={toggleChainVisibility} type="button">
                {showAllChains || showAllProducts ? "Show default only" : `+${extraChainCount} more chains`}
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
  groupId: string
  label: string
  rootMaterialNames: string[]
  startingMaterialNames: string[]
  classification: string
  color: string
  materialCount: number
  groupScore: number | null
  isDefaultVisible: boolean
  displayOrder: number
  avgEndUseAtt: number | null
  maxEndUseAtt: number | null
  rootId: string
  rootName: string
  materials: MapMaterial[]
  applications: DeployAppEdge[]
}

type FocusLaneMaterial = {
  id: string
  name: string
  type: string
  verticalOrder: number
  isRoot: boolean
}

type FocusLaneEdge = {
  sourceId: string
  targetId: string
  routeName: string | null
  inferred?: boolean
}

type FocusLaneLayout = {
  columns: FocusLaneMaterial[][]
  edges: FocusLaneEdge[]
  positions: Map<string, { column: number; row: number }>
  laneRows: Map<string, number>
}

function ChainCluster({
  chain,
  index,
  onSelect,
  rootPosition,
  total
}: {
  chain: MapChain
  index: number
  onSelect: () => void
  rootPosition: { x: number; y: number }
  total: number
}) {
  const chainSize = scoreToNodeSize(chain.groupScore)
  const chainPosition = chainPositionForRoot(rootPosition, index, total)
  const x = roundCoord(chainPosition.x)
  const y = roundCoord(chainPosition.y)

  return (
    <div className="radial-chain active" style={{ "--chain-color": chain.color } as CustomProperties}>
      <svg className="radial-connector" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1={rootPosition.x} y1={rootPosition.y} x2={x} y2={y} />
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
    </div>
  )
}

function FocusedChainMap({
  chain,
  streamRootMaterials
}: {
  chain: MapChain
  streamRootMaterials: Material[]
}) {
  const laneLayout = buildFocusLaneLayout(chain, streamRootMaterials)
  return <FocusedChainLane chain={chain} layout={laneLayout} />
}

function FocusedChainLane({ chain, layout }: { chain: MapChain; layout: FocusLaneLayout }) {
  const points = lanePoints(layout)
  const materials = layout.columns.flat()
  return (
    <div className="focus-lane-map" style={{ "--chain-color": chain.color } as CustomProperties}>
      <div className="focus-lane-header">
        <span className="chain-badge">{chain.classification}</span>
        <strong>{chain.label}</strong>
      </div>
      <div className="focus-lane-canvas">
        <svg className="focus-lane-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id={`lane-arrow-${chain.id}`} markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5">
              <path d="M0,0 L7,3.5 L0,7 Z" />
            </marker>
          </defs>
          {layout.edges.map((edge) => {
            const source = layout.positions.get(edge.sourceId)
            const target = layout.positions.get(edge.targetId)
            if (!source || !target) return null
            const sourcePoint = points.get(edge.sourceId)
            const targetPoint = points.get(edge.targetId)
            if (!sourcePoint || !targetPoint) return null
            return (
              <line
                key={`${edge.sourceId}-${edge.targetId}-${edge.routeName}`}
                markerEnd={`url(#lane-arrow-${chain.id})`}
                x1={sourcePoint.x}
                x2={targetPoint.x}
                y1={sourcePoint.y}
                y2={targetPoint.y}
              >
                {edge.routeName ? <title>{edge.routeName}</title> : null}
              </line>
            )
          })}
        </svg>
        {materials.map((material) => {
          const point = points.get(material.id)
          if (!point) return null
          return (
            <Link
              className={`focus-lane-node ${material.isRoot ? "root-lane-node" : ""}`}
              href={`/materials/${material.id}`}
              key={material.id}
              style={{ left: coordPercent(point.x), top: coordPercent(point.y) }}
            >
              <strong>{material.name}</strong>
              <small>{material.type}</small>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function FeedstockNode({ node, position }: { node: Material; position: { x: number; y: number } }) {
  return (
    <Link className="feedstock-node" href={`/materials/${node.id}`} style={{ left: coordPercent(position.x), top: coordPercent(position.y) }}>
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
        <span><ArrowRight size={14} /> Direction</span>
      </div>
    </>
  )
}

function getRootMaterialsByStream(graph: StreamGraph) {
  const streamGroups = streamMaterialGroups(graph.stream.category)
  const graphMaterials = new Map<string, Material>(graph.nodes.map((node) => [node.id, node]))
  const roots = deployDb.material_card
    .filter((card) => {
      if (!card.material_id || card.material_type !== "Base chemical") return false
      return Boolean(card.material_group && streamGroups.has(card.material_group))
    })
    .map((card) => materialFromSources(card.material_id, graphMaterials, card))
    .filter(Boolean) as Material[]

  const seen = new Set<string>()
  const uniqueRoots = roots.filter((root) => {
    if (seen.has(root.id)) return false
    seen.add(root.id)
    return true
  })

  if (uniqueRoots.length) return uniqueRoots.sort((a, b) => a.verticalOrder - b.verticalOrder || a.name.localeCompare(b.name))
  return graph.nodes.filter((node) => node.depth === 0).sort((a, b) => a.verticalOrder - b.verticalOrder || a.name.localeCompare(b.name))
}

function streamMaterialGroups(stream: string) {
  if (stream === "Aromatics") return new Set(["Aromatics", "Benzene", "Toluene", "Xylene"])
  if (stream === "Methanol") return new Set(["Methanol", "C1"])
  return new Set([stream])
}

function resolveChainRoots(chain: { root_materials?: string[] | null }, rootMaterials: Material[]) {
  const rootNames = new Set(effectiveRootMaterialNames(chain).map(normalizeMatch).filter(Boolean) as string[])
  return rootMaterials.filter((root) => rootNames.has(normalizeMatch(root.name) ?? ""))
}

function groupChainsByRoot(chains: MapChain[], rootMaterials: Material[]) {
  const grouped = new Map<string, MapChain[]>()
  for (const root of rootMaterials) grouped.set(root.id, [])
  for (const chain of chains) {
    if (!grouped.has(chain.rootId)) continue
    grouped.set(chain.rootId, [...(grouped.get(chain.rootId) ?? []), chain])
  }
  return grouped
}

function uniqueChainsByGroup(chains: MapChain[]) {
  const seen = new Set<string>()
  return chains.filter((chain) => {
    if (seen.has(chain.groupId)) return false
    seen.add(chain.groupId)
    return true
  })
}

function rootPosition(index: number, total: number) {
  if (total <= 1) return { x: roundCoord(centerCoord), y: roundCoord(rootY) }
  const left = total >= 4 ? 14 : 20
  const right = total >= 4 ? 86 : 80
  return {
    x: roundCoord(left + ((right - left) * index) / (total - 1)),
    y: roundCoord(rootY)
  }
}

function chainPositionForRoot(root: { x: number; y: number }, index: number, total: number) {
  const columns = Math.min(Math.max(total, 1), 4)
  const row = Math.floor(index / columns)
  const column = index % columns
  const gap = total <= 1 ? 0 : 12
  const x = root.x + (column - (columns - 1) / 2) * gap
  const y = root.y + 25 + row * 18
  return {
    x: roundCoord(Math.max(8, Math.min(92, x))),
    y: roundCoord(Math.max(42, Math.min(82, y)))
  }
}

function buildMapChains(graph: StreamGraph, rootMaterials: Material[]): MapChain[] {
  const graphMaterials = new Map<string, Material>(graph.nodes.map((node) => [node.id, node]))
  const cardsById = new Map(deployDb.material_card.map((card) => [card.material_id, card]).filter(([id]) => id) as [string, DeployMaterialCard][])
  const graphIds = new Set(graph.nodes.map((node) => node.id))
  const streamGroups = streamMaterialGroups(graph.stream.category)
  const streamCards = deployDb.material_card.filter((card) => card.material_id && ((card.material_group && streamGroups.has(card.material_group)) || graphIds.has(card.material_id)))
  const streamIds = new Set(streamCards.map((card) => card.material_id).filter(Boolean) as string[])
  const currentStream = graph.stream.category
  const depthById = new Map(graph.nodes.map((node) => [node.id, node.depth]))
  const routeDepthById = routeDepthFallback(graph)

  return deployDb.chain_master
    .flatMap((chain, index) => {
      const allRows = deployDb.chain_material_map.filter((row) => row.group_id === chain.group_id && row.material_id)
      const matchedRoots = resolveChainRoots(chain, rootMaterials)
      if (!matchedRoots.length) {
        if (chain.stream === currentStream) {
          console.warn(
            `[MapView] Unassigned chain skipped: ${chain.group_id ?? "-"} ${chain.group_name ?? "-"}, root_materials=${(chain.root_materials ?? []).join(";")}, stream=${currentStream}`
          )
        }
        return []
      }
      const rows = allRows.filter((row) => row.material_id && streamIds.has(row.material_id))
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

      if (!materials.length) return []
      const sortedMaterials = materials.sort(sortMapMaterial)
      const chainSlug = slugify(chain.group_name || chain.group_id || `chain-${index}`)
      const materialIds = new Set(sortedMaterials.map((material) => material.id))
      const applications = deployDb.app_edges.filter((edge) => edge.material_id && materialIds.has(edge.material_id))

      return matchedRoots.map((rootMaterial, rootIndex) => ({
        id: `${chain.group_id || chainSlug}-${rootMaterial.id}`,
        groupId: chain.group_id || chainSlug,
        label: chain.group_name || chain.group_id || `Chain ${index + 1}`,
        rootMaterialNames: chain.root_materials ?? [],
        startingMaterialNames: chain.starting_materials ?? [],
        classification: classifyChain(chain.group_name, sortedMaterials),
        color: chainColors[(index + rootIndex) % chainColors.length],
        materialCount: chain.material_count,
        groupScore: chain.group_score,
        isDefaultVisible: chain.is_default_visible === true,
        displayOrder: chain.display_order ?? index + 1000,
        avgEndUseAtt: chain.avg_end_use_att,
        maxEndUseAtt: chain.max_end_use_att,
        rootId: rootMaterial.id,
        rootName: rootMaterial.name,
        materials: sortedMaterials,
        applications
      }))
    })
    .sort((a, b) => (a?.displayOrder ?? 9999) - (b?.displayOrder ?? 9999) || (a?.label ?? "").localeCompare(b?.label ?? "")) as MapChain[]
}

function buildFocusLaneLayout(chain: MapChain, streamRootMaterials: Material[]): FocusLaneLayout {
  const manualEdges = chainRouteOverrideEdges(chain)
  if (manualEdges.length) {
    const manualLayout = buildManualFocusLaneLayout(chain, manualEdges)
    if (manualLayout) return manualLayout
    return buildMinimumLaneLayout(chain, streamRootMaterials)
  }

  const selectedRootMaterial = streamRootMaterials.find((material) => material.id === chain.rootId || material.name === chain.rootName)
  if (!selectedRootMaterial) return buildMinimumLaneLayout(chain, streamRootMaterials)

  const nodeMap = new Map<string, FocusLaneMaterial>()
  const rootMaterials = uniqueMaterialsByName([selectedRootMaterial, ...effectiveRootMaterialNames(chain).map(materialByName).filter(Boolean) as Material[]])
  const startingMaterials = uniqueMaterialsByName(chain.startingMaterialNames.map(materialByName).filter(Boolean) as Material[])
  for (const rootMaterial of rootMaterials) nodeMap.set(rootMaterial.id, toFocusLaneMaterial(rootMaterial, true))
  for (const startingMaterial of startingMaterials) nodeMap.set(startingMaterial.id, toFocusLaneMaterial(startingMaterial, rootMaterials.some((root) => root.id === startingMaterial.id)))
  for (const item of chain.materials) {
    nodeMap.set(item.id, toFocusLaneMaterial(item.material, rootMaterials.some((root) => root.id === item.id)))
  }
  if (nodeMap.size <= 1) return buildMinimumLaneLayout(chain, streamRootMaterials)

  const edges = deployDb.route_edges
    .filter((edge): edge is DeployRouteEdge & { source_material_id: string; target_material_id: string } =>
      Boolean(edge.source_material_id && edge.target_material_id && nodeMap.has(edge.source_material_id) && nodeMap.has(edge.target_material_id))
    )
    .map((edge) => ({
      sourceId: edge.source_material_id,
      targetId: edge.target_material_id,
      routeName: edge.route_name
    }))

  const inferredEdges = inferFocusLaneEdges(chain, rootMaterials, startingMaterials, edges, nodeMap)
  const allEdges = mergeLaneEdges(edges, inferredEdges)
  if (!allEdges.length) return buildMinimumLaneLayout(chain, streamRootMaterials)
  if (inferredEdges.length) console.warn(`[MapView] Lane layout used inferred sequence: ${chain.label}`)

  const adjacency = new Map<string, FocusLaneEdge[]>()
  const indegree = new Map<string, number>()
  for (const id of nodeMap.keys()) indegree.set(id, 0)
  for (const edge of allEdges) {
    adjacency.set(edge.sourceId, [...(adjacency.get(edge.sourceId) ?? []), edge])
    indegree.set(edge.targetId, (indegree.get(edge.targetId) ?? 0) + 1)
  }

  const rootIds = rootMaterials.map((material) => material.id)
  const reachable = new Set<string>(rootIds)
  const stack = [...rootIds]
  while (stack.length) {
    const sourceId = stack.pop()
    if (!sourceId) continue
    for (const edge of adjacency.get(sourceId) ?? []) {
      if (reachable.has(edge.targetId)) continue
      reachable.add(edge.targetId)
      stack.push(edge.targetId)
    }
  }

  if (reachable.size < nodeMap.size) {
    const disconnected = Array.from(nodeMap.keys()).filter((id) => !reachable.has(id))
    for (const id of disconnected) nodeMap.delete(id)
  }

  const queue = Array.from(nodeMap.keys())
    .filter((id) => (indegree.get(id) ?? 0) === 0)
    .sort((a, b) => sortFocusLaneMaterial(nodeMap.get(a), nodeMap.get(b)))
  for (const rootId of [...rootIds].reverse()) {
    if (!queue.includes(rootId) && nodeMap.has(rootId)) queue.unshift(rootId)
  }

  const columnsById = new Map<string, number>(rootIds.filter((id) => nodeMap.has(id)).map((id) => [id, 0]))
  let visitedCount = 0
  while (queue.length) {
    const sourceId = queue.shift()
    if (!sourceId) continue
    visitedCount += 1
    const sourceColumn = columnsById.get(sourceId) ?? 0
    for (const edge of adjacency.get(sourceId) ?? []) {
      columnsById.set(edge.targetId, Math.max(columnsById.get(edge.targetId) ?? 0, sourceColumn + 1))
      const nextIndegree = (indegree.get(edge.targetId) ?? 0) - 1
      indegree.set(edge.targetId, nextIndegree)
      if (nextIndegree === 0) queue.push(edge.targetId)
    }
    queue.sort((a, b) => sortFocusLaneMaterial(nodeMap.get(a), nodeMap.get(b)))
  }

  if (visitedCount < nodeMap.size) return buildMinimumLaneLayout(chain, streamRootMaterials)

  const columnMap = new Map<number, FocusLaneMaterial[]>()
  for (const [id, material] of nodeMap.entries()) {
    const column = columnsById.get(id)
    if (column === undefined) return buildMinimumLaneLayout(chain, streamRootMaterials)
    columnMap.set(column, [...(columnMap.get(column) ?? []), material])
  }

  const columns = Array.from(columnMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, materials]) => materials.sort(sortFocusLaneMaterial))
  const positions = new Map<string, { column: number; row: number }>()
  columns.forEach((materials, column) => {
    materials.forEach((material, row) => positions.set(material.id, { column, row }))
  })

  return {
    columns,
    edges: allEdges.filter((edge) => positions.has(edge.sourceId) && positions.has(edge.targetId)),
    positions,
    laneRows: focusLaneRows(chain)
  }
}

function inferFocusLaneEdges(
  chain: MapChain,
  rootMaterials: Material[],
  startingMaterials: Material[],
  existingEdges: FocusLaneEdge[],
  nodeMap: Map<string, FocusLaneMaterial>
) {
  const inferred: FocusLaneEdge[] = []
  const chainMaterials = chain.materials.map((item) => item.material).filter((material) => nodeMap.has(material.id))
  const starts = startingMaterials.filter((material) => nodeMap.has(material.id) && !rootMaterials.some((root) => root.id === material.id))
  const orderedMaterials = uniqueMaterialsById([...starts, ...chainMaterials])
  const finalMaterials = finalProductCandidates(chain, starts)
  const edgeExists = (sourceId: string, targetId: string) =>
    existingEdges.some((edge) => edge.sourceId === sourceId && edge.targetId === targetId) ||
    inferred.some((edge) => edge.sourceId === sourceId && edge.targetId === targetId)
  const addEdge = (sourceId: string, targetId: string) => {
    if (sourceId === targetId || !nodeMap.has(sourceId) || !nodeMap.has(targetId) || edgeExists(sourceId, targetId)) return
    inferred.push({ sourceId, targetId, routeName: "Inferred sequence", inferred: true })
  }

  if (starts.length) {
    for (const start of starts) {
      const hasIncoming = existingEdges.some((edge) => edge.targetId === start.id)
      if (hasIncoming) continue
      if (rootMaterials.length === 1) addEdge(rootMaterials[0].id, start.id)
    }
  } else {
    const nonRootMaterials = orderedMaterials.filter((material) => !rootMaterials.some((root) => root.id === material.id))
    if (!existingEdges.length && rootMaterials.length === 1) nonRootMaterials.forEach((material) => addEdge(rootMaterials[0].id, material.id))
  }

  if (starts.length && finalMaterials.length) {
    for (const start of starts) {
      const hasOutgoing = existingEdges.some((edge) => edge.sourceId === start.id)
      if (!hasOutgoing) finalMaterials.forEach((product) => addEdge(start.id, product.id))
    }
  }

  if (starts.length && finalMaterials.length === 1) {
    for (const start of starts) addEdge(start.id, finalMaterials[0].id)
  }

  if (chain.label === "Ethanolamine Chain" && starts.length === 1) {
    const start = starts[0]
    for (const material of chainMaterials) {
      if (material.id !== start.id) addEdge(start.id, material.id)
    }
  }

  if (!starts.length && !existingEdges.length && rootMaterials.length === 1) {
    const nonRootMaterials = orderedMaterials.filter((material) => !rootMaterials.some((root) => root.id === material.id))
    if (finalMaterials.length > 1) {
      nonRootMaterials.forEach((material) => addEdge(rootMaterials[0].id, material.id))
    } else {
      const sequence = uniqueMaterialsById([...rootMaterials, ...nonRootMaterials])
      for (let index = 0; index < sequence.length - 1; index += 1) addEdge(sequence[index].id, sequence[index + 1].id)
    }
  }

  return inferred
}

function buildManualFocusLaneLayout(chain: MapChain, manualEdges: { source: string; target: string; routeName: string }[]): FocusLaneLayout | null {
  const nodeMap = new Map<string, FocusLaneMaterial>()
  const edges = manualEdges
    .map((edge) => {
      const source = materialByName(edge.source)
      const target = materialByName(edge.target)
      if (!source || !target) return null
      nodeMap.set(source.id, toFocusLaneMaterial(source, chain.rootMaterialNames.includes(source.name)))
      nodeMap.set(target.id, toFocusLaneMaterial(target, chain.rootMaterialNames.includes(target.name)))
      return { sourceId: source.id, targetId: target.id, routeName: edge.routeName }
    })
    .filter(Boolean) as FocusLaneEdge[]

  if (!edges.length || nodeMap.size <= 1) return null
  return buildDagLaneLayout(chain, nodeMap, edges)
}

function buildDagLaneLayout(chain: MapChain, nodeMap: Map<string, FocusLaneMaterial>, edges: FocusLaneEdge[]): FocusLaneLayout | null {
  const adjacency = new Map<string, FocusLaneEdge[]>()
  const indegree = new Map<string, number>()
  for (const id of nodeMap.keys()) indegree.set(id, 0)
  for (const edge of edges) {
    adjacency.set(edge.sourceId, [...(adjacency.get(edge.sourceId) ?? []), edge])
    indegree.set(edge.targetId, (indegree.get(edge.targetId) ?? 0) + 1)
  }

  const queue = Array.from(nodeMap.keys())
    .filter((id) => (indegree.get(id) ?? 0) === 0)
    .sort((a, b) => sortFocusLaneMaterial(nodeMap.get(a), nodeMap.get(b)))
  const columnsById = new Map(queue.map((id) => [id, 0]))
  let visitedCount = 0

  while (queue.length) {
    const sourceId = queue.shift()
    if (!sourceId) continue
    visitedCount += 1
    const sourceColumn = columnsById.get(sourceId) ?? 0
    for (const edge of adjacency.get(sourceId) ?? []) {
      columnsById.set(edge.targetId, Math.max(columnsById.get(edge.targetId) ?? 0, sourceColumn + 1))
      const nextIndegree = (indegree.get(edge.targetId) ?? 0) - 1
      indegree.set(edge.targetId, nextIndegree)
      if (nextIndegree === 0) queue.push(edge.targetId)
    }
    queue.sort((a, b) => sortFocusLaneMaterial(nodeMap.get(a), nodeMap.get(b)))
  }

  if (visitedCount < nodeMap.size) return null

  const columnMap = new Map<number, FocusLaneMaterial[]>()
  for (const [id, material] of nodeMap.entries()) {
    const column = columnsById.get(id)
    if (column === undefined) return null
    columnMap.set(column, [...(columnMap.get(column) ?? []), material])
  }

  const columns = Array.from(columnMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, materials]) => materials.sort(sortFocusLaneMaterial))
  const positions = new Map<string, { column: number; row: number }>()
  columns.forEach((materials, column) => {
    materials.forEach((material, row) => positions.set(material.id, { column, row }))
  })

  return {
    columns,
    edges,
    positions,
    laneRows: focusLaneRows(chain)
  }
}

function buildMinimumLaneLayout(chain: MapChain, streamRootMaterials: Material[]): FocusLaneLayout {
  const selectedRootMaterial = streamRootMaterials.find((material) => material.id === chain.rootId || material.name === chain.rootName)
  const rootMaterials = uniqueMaterialsByName([
    ...(selectedRootMaterial ? [selectedRootMaterial] : []),
    ...effectiveRootMaterialNames(chain).map(materialByName).filter(Boolean) as Material[]
  ])
  const startingMaterials = uniqueMaterialsByName(chain.startingMaterialNames.map(materialByName).filter(Boolean) as Material[])
  const orderedMaterials = uniqueMaterialsById([
    ...rootMaterials,
    ...startingMaterials,
    ...chain.materials.map((item) => item.material)
  ])
  const fallbackMaterials = orderedMaterials.length ? orderedMaterials : chain.materials.map((item) => item.material)
  const nodeMap = new Map<string, FocusLaneMaterial>()
  for (const material of fallbackMaterials) {
    nodeMap.set(material.id, toFocusLaneMaterial(material, rootMaterials.some((root) => root.id === material.id)))
  }

  const edges: FocusLaneEdge[] = []
  for (let index = 0; index < fallbackMaterials.length - 1; index += 1) {
    const source = fallbackMaterials[index]
    const target = fallbackMaterials[index + 1]
    if (source.id !== target.id) edges.push({ sourceId: source.id, targetId: target.id, routeName: "Material order" })
  }

  if (!edges.length && fallbackMaterials.length === 1) {
    const only = fallbackMaterials[0]
    return {
      columns: [[toFocusLaneMaterial(only, rootMaterials.some((root) => root.id === only.id))]],
      edges: [],
      positions: new Map([[only.id, { column: 0, row: 0 }]]),
      laneRows: focusLaneRows(chain)
    }
  }

  return buildDagLaneLayout(chain, nodeMap, edges) ?? {
    columns: fallbackMaterials.map((material) => [toFocusLaneMaterial(material, rootMaterials.some((root) => root.id === material.id))]),
    edges,
    positions: new Map(fallbackMaterials.map((material, column) => [material.id, { column, row: 0 }])),
    laneRows: focusLaneRows(chain)
  }
}

const chainRouteOverrides: Record<string, { source: string; target: string; routeName: string }[]> = {
  G30: [
    { source: "Propylene", target: "PO", routeName: "Propylene to PO" },
    { source: "PO", target: "Polyols", routeName: "PO to Polyols" },
    { source: "Polyols", target: "PU", routeName: "Polyols to PU" },
    { source: "Benzene", target: "Aniline", routeName: "Benzene to Aniline" },
    { source: "Aniline", target: "MDI", routeName: "Aniline to MDI" },
    { source: "MDI", target: "PU", routeName: "MDI to PU" },
    { source: "Toluene", target: "TDI", routeName: "Toluene to TDI" },
    { source: "TDI", target: "PU", routeName: "TDI to PU" }
  ],
  "PP Chain": [{ source: "Propylene", target: "PP", routeName: "Propylene to PP" }],
  "LAB Chain": [{ source: "Benzene", target: "LAB", routeName: "Benzene to LAB" }],
  "Nylon/PA Chain": [
    { source: "Benzene", target: "Cyclohexane", routeName: "Benzene to Cyclohexane" },
    { source: "Cyclohexane", target: "Cyclohexanone", routeName: "Cyclohexane to Cyclohexanone" },
    { source: "Cyclohexanone", target: "Caprolactam", routeName: "Cyclohexanone to Caprolactam" },
    { source: "Cyclohexanone", target: "Adipic Acid", routeName: "Cyclohexanone to Adipic Acid" }
  ],
  "C4 Elastomer Chain": [
    { source: "Isobutylene", target: "Butyl rubber", routeName: "Isobutylene to Butyl rubber" },
    { source: "Isobutylene", target: "EPDM", routeName: "Isobutylene to EPDM" }
  ],
  "Epoxy Chain": [
    { source: "Benzene", target: "Cumene", routeName: "Benzene to Cumene" },
    { source: "Cumene", target: "Phenol", routeName: "Cumene to Phenol" },
    { source: "Phenol", target: "BPA", routeName: "Phenol to BPA" },
    { source: "Propylene", target: "ECH", routeName: "Propylene to ECH" },
    { source: "BPA", target: "Epoxy resin", routeName: "BPA to Epoxy resin" },
    { source: "ECH", target: "Epoxy resin", routeName: "ECH to Epoxy resin" }
  ],
  "PU Chain": [
    { source: "Propylene", target: "PO", routeName: "Propylene to PO" },
    { source: "PO", target: "Polyols", routeName: "PO to Polyols" },
    { source: "Polyols", target: "PU", routeName: "Polyols to PU" },
    { source: "Benzene", target: "Aniline", routeName: "Benzene to Aniline" },
    { source: "Aniline", target: "MDI", routeName: "Aniline to MDI" },
    { source: "MDI", target: "PU", routeName: "MDI to PU" },
    { source: "Toluene", target: "TDI", routeName: "Toluene to TDI" },
    { source: "TDI", target: "PU", routeName: "TDI to PU" }
  ],
  "UPR Platform": [
    { source: "Propylene", target: "PG", routeName: "Propylene to PG" },
    { source: "n-Butane", target: "MA", routeName: "n-Butane to MA" },
    { source: "Xylene", target: "PA", routeName: "Xylene to PA" },
    { source: "PG", target: "UPR", routeName: "PG to UPR" },
    { source: "MA", target: "UPR", routeName: "MA to UPR" },
    { source: "PA", target: "UPR", routeName: "PA to UPR" }
  ]
}

function chainRouteOverrideEdges(chain: MapChain) {
  return chainRouteOverrides[chain.groupId] ?? chainRouteOverrides[chain.label] ?? []
}

function effectiveRootMaterialNames(chain: { root_materials?: string[] | null; group_name?: string | null; label?: string }) {
  const rootNames = [...(chain.root_materials ?? [])]
  const label = "label" in chain ? chain.label : chain.group_name
  if (label === "UPR Platform" && !rootNames.includes("n-Butane")) rootNames.push("n-Butane")
  return rootNames
}

function focusLaneRows(chain: MapChain) {
  const rows = new Map<string, number>()
  const setRow = (name: string, row: number) => {
    const material = materialByName(name)
    if (material) rows.set(material.id, row)
  }
  if (chain.label === "PU Chain") {
    for (const name of ["Propylene", "PO", "Polyols"]) setRow(name, 0)
    for (const name of ["Benzene", "Aniline", "MDI"]) setRow(name, 1)
    for (const name of ["Toluene", "TDI"]) setRow(name, 2)
    setRow("PU", 1)
  }
  if (chain.label === "UPR Platform") {
    for (const name of ["Propylene", "PG"]) setRow(name, 0)
    for (const name of ["n-Butane", "MA"]) setRow(name, 1)
    for (const name of ["Xylene", "PA"]) setRow(name, 2)
    setRow("UPR", 1)
  }
  if (chain.label === "Epoxy Chain") {
    for (const name of ["Benzene", "Cumene", "Phenol", "BPA"]) setRow(name, 0)
    for (const name of ["Propylene", "ECH"]) setRow(name, 1)
    setRow("Epoxy resin", 0)
  }
  if (chain.label === "Ethanolamine Chain") {
    setRow("Ethylene", 1)
    setRow("EO", 1)
    setRow("MEA", 0)
    setRow("DEA", 1)
    setRow("TEA", 2)
  }
  return rows
}

function finalProductCandidates(chain: MapChain, starts: Material[]) {
  const startIds = new Set(starts.map((material) => material.id))
  const nonStartMaterials = chain.materials.map((item) => item.material).filter((material) => !startIds.has(material.id))
  const productLike = nonStartMaterials.filter((material) => {
    const value = `${material.type} ${material.subtype} ${material.name}`.toLowerCase()
    return /(polymer|resin|product|material|pet|pvc|ps|pu|dmc|abs|br|sbr|nbr|hdpe|ldpe|lldpe)/.test(value)
  })
  if (productLike.length) return productLike
  return nonStartMaterials.length ? [nonStartMaterials[nonStartMaterials.length - 1]] : []
}

function mergeLaneEdges(edges: FocusLaneEdge[], inferredEdges: FocusLaneEdge[]) {
  const seen = new Set<string>()
  return [...edges, ...inferredEdges].filter((edge) => {
    const key = `${edge.sourceId}->${edge.targetId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function materialByName(name: string) {
  const card = deployDb.material_card.find((material) => material.material_name === name)
  if (!card?.material_id || !card.material_name) return null
  return materialFromCard(card)
}

function materialFromCard(card: DeployMaterialCard): Material {
  return {
    id: card.material_id || "",
    group: card.material_group || "",
    category: card.material_group || "",
    name: card.material_name || "",
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

function uniqueMaterialsByName(materials: Material[]) {
  const seen = new Set<string>()
  return materials.filter((material) => {
    const key = material.name
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function uniqueMaterialsById(materials: Material[]) {
  const seen = new Set<string>()
  return materials.filter((material) => {
    if (seen.has(material.id)) return false
    seen.add(material.id)
    return true
  })
}

function toFocusLaneMaterial(material: Material, isRoot: boolean): FocusLaneMaterial {
  return {
    id: material.id,
    name: material.name,
    type: material.type,
    verticalOrder: material.verticalOrder,
    isRoot
  }
}

function sortFocusLaneMaterial(a: FocusLaneMaterial | undefined, b: FocusLaneMaterial | undefined) {
  if (!a || !b) return 0
  return a.verticalOrder - b.verticalOrder || a.name.localeCompare(b.name)
}

function lanePoints(layout: FocusLaneLayout) {
  const points = new Map<string, { x: number; y: number }>()
  const columnCount = layout.columns.length
  const hintedRows = Array.from(layout.laneRows.values())
  const maxHintedRow = hintedRows.length ? Math.max(...hintedRows) : -1
  const totalRows = Math.max(maxHintedRow + 1, ...layout.columns.map((column) => column.length), 1)
  layout.columns.forEach((column, columnIndex) => {
    const x = columnCount <= 1 ? centerCoord : 10 + (80 * columnIndex) / (columnCount - 1)
    column.forEach((material, rowIndex) => {
      const preferredRow = layout.laneRows.get(material.id) ?? rowIndex
      const y = totalRows <= 1 ? centerCoord : 28 + (44 * preferredRow) / (totalRows - 1)
      points.set(material.id, { x: roundCoord(x), y: roundCoord(y) })
    })
  })
  return points
}

function normalizeMatch(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? null
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
  const displayOrder = row.display_order ?? (row.total_score !== null && row.total_score !== undefined ? -row.total_score : null)

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
  return representativeNames.includes(material.name) || depth <= 1 || row.total_score != null || row.end_use_att !== null || material.type === "Polymer"
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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

type CustomProperties = CSSProperties & Record<`--${string}`, string>
