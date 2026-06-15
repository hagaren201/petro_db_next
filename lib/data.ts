import data from "@/data/generated/petro-data.json"
import type { Edge, Material, PetroData, RawTrade, StreamDefinition } from "./types"

export const petroData = data as PetroData

export const typeColors: Record<string, string> = {
  "Base chemical": "#111827",
  Intermediate: "#0f766e",
  Monomer: "#2563eb",
  Polymer: "#7c3aed",
  "Functional Material": "#c2410c",
  Other: "#64748b"
}

export function getStream(slug: string) {
  return petroData.streamDefs.find((stream) => stream.slug === slug)
}

export function getMaterial(id: string) {
  return petroData.materials.find((material) => material.id === id)
}

export function materialSlugName(id: string) {
  return getMaterial(id)?.name || id
}

export function getMaterialTrade(materialId: string) {
  return petroData.tradeSummary.filter((row) => row.materialId === materialId)
}

export function getRawTradeForMaterial(materialId: string) {
  const hskCodes = new Set(getMaterialTrade(materialId).map((row) => row.hsk10).filter(Boolean))
  return petroData.rawTrade.filter((row) => hskCodes.has(row.hsk10))
}

export function formatNumber(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-"
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value)
}

export function formatCapacity(materialId: string) {
  const info = petroData.supplierInfoByMaterial[materialId]
  if (!info || !info.totalCapacity) return "-"
  return `${formatNumber(info.totalCapacity)} ${info.capacityUnit}`.trim()
}

export function streamMaterials(stream: StreamDefinition) {
  return petroData.materials
    .filter((material) => material.category === stream.category)
    .sort((a, b) => a.verticalOrder - b.verticalOrder || a.name.localeCompare(b.name))
}

export function streamOverview(stream: StreamDefinition) {
  const materials = streamMaterials(stream)
  const materialIds = new Set(materials.map((material) => material.id))
  const routes = new Set(
    petroData.edges.filter((edge) => materialIds.has(edge.src) || materialIds.has(edge.dst)).map((edge) => edge.routeId)
  )
  const suppliers = new Set<string>()
  for (const material of materials) {
    for (const supplier of petroData.materialSuppliers[material.id] || []) suppliers.add(supplier.supplierId)
  }
  const products = materials
    .filter((material) => !stream.roots.includes(material.name))
    .slice(0, 5)
    .map((material) => material.name)

  return {
    materialCount: materials.length,
    routeCount: routes.size,
    supplierCount: suppliers.size,
    products
  }
}

export type GraphNode = Material & { depth: number }

export type StreamGraph = {
  stream: StreamDefinition
  nodes: GraphNode[]
  edges: Edge[]
  nodesByDepth: [number, GraphNode[]][]
  edgesBySource: Record<string, Edge[]>
}

export function buildStreamGraph(stream: StreamDefinition, maxDepth = 5): StreamGraph {
  const rootIds = stream.roots
    .map((name) => petroData.materials.find((material) => material.name === name)?.id)
    .filter(Boolean) as string[]
  const allowedRootSet = new Set(rootIds)
  const edgeAdj = new Map<string, Edge[]>()
  for (const edge of petroData.edges) {
    const src = getMaterial(edge.src)
    const dst = getMaterial(edge.dst)
    if (!src || !dst || src.visualExclude || dst.visualExclude) continue
    if (!edgeAdj.has(edge.src)) edgeAdj.set(edge.src, [])
    edgeAdj.get(edge.src)?.push(edge)
  }

  const depthById = new Map<string, number>()
  const collectedEdges: Edge[] = []
  const queue: { id: string; depth: number }[] = rootIds.map((id) => ({ id, depth: 0 }))
  for (const id of rootIds) depthById.set(id, 0)

  while (queue.length) {
    const current = queue.shift()
    if (!current || current.depth >= maxDepth) continue
    const outgoing = (edgeAdj.get(current.id) || []).sort((a, b) => materialSlugName(a.dst).localeCompare(materialSlugName(b.dst)))
    for (const edge of outgoing) {
      const nextDepth = current.depth + 1
      collectedEdges.push(edge)
      if (!depthById.has(edge.dst) || nextDepth < (depthById.get(edge.dst) || 99)) {
        depthById.set(edge.dst, nextDepth)
        queue.push({ id: edge.dst, depth: nextDepth })
      }
    }
  }

  const nodes = Array.from(depthById.entries())
    .map(([id, depth]) => ({ ...(getMaterial(id) as Material), depth: allowedRootSet.has(id) ? 0 : depth }))
    .sort((a, b) => a.depth - b.depth || a.verticalOrder - b.verticalOrder || a.name.localeCompare(b.name))
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = collectedEdges.filter((edge) => nodeIds.has(edge.src) && nodeIds.has(edge.dst))

  const byDepth = new Map<number, GraphNode[]>()
  for (const node of nodes) {
    if (!byDepth.has(node.depth)) byDepth.set(node.depth, [])
    byDepth.get(node.depth)?.push(node)
  }

  const edgesBySource: Record<string, Edge[]> = {}
  for (const edge of edges) {
    edgesBySource[edge.src] ??= []
    edgesBySource[edge.src].push(edge)
  }

  return {
    stream,
    nodes,
    edges,
    nodesByDepth: Array.from(byDepth.entries()).sort(([a], [b]) => a - b),
    edgesBySource
  }
}

export function upstreamEdges(materialId: string) {
  return petroData.edges.filter((edge) => edge.dst === materialId)
}

export function downstreamEdges(materialId: string) {
  return petroData.edges.filter((edge) => edge.src === materialId)
}

export function tradeSeries(rawRows: RawTrade[]) {
  const byYear = new Map<number, { year: number; export: number; import: number; net: number }>()
  for (const row of rawRows) {
    const existing = byYear.get(row.year) || { year: row.year, export: 0, import: 0, net: 0 }
    existing.export += row.export
    existing.import += row.import
    existing.net = existing.export - existing.import
    byYear.set(row.year, existing)
  }
  return Array.from(byYear.values()).sort((a, b) => a.year - b.year)
}
