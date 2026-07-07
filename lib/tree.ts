import type { Edge, Material } from "./types"
import type { StreamGraph } from "./data"

export type StreamTreeNode = {
  id: string
  material: Material
  children: StreamTreeNode[]
  routes: Edge[]
}

export type StreamTreeGroup = {
  id: string
  label: string
  color: string
  children: StreamTreeNode[]
}

const c2Groups = [
  { id: "polyolefin", label: "Polyolefin Chain", color: "#7c5fb8", seeds: ["HDPE", "LDPE", "LLDPE", "LAO", "PAO", "EPDM", "1-Butene", "PB-1", "1-Hexene", "1-Octene"] },
  { id: "eo-eg", label: "EO / EG Chain", color: "#3f9b8f", seeds: ["EO", "EC", "MEG", "PET", "Ethoxylate", "EG", "Ethanolamines"] },
  { id: "pvc", label: "PVC Chain", color: "#3d7dcc", seeds: ["EDC", "VCM", "PVC"] },
  { id: "oxo-alcohol", label: "Oxo / Alcohol Chain", color: "#d68636", seeds: ["Ethanol", "n-Butanol", "2-Ethylhexanol", "Oxo Alcohols", "Ethyl acrylate"] },
  { id: "acetate", label: "Acetate Chain", color: "#d95f68", seeds: ["VAM", "EVA", "PVA", "Ethyl acetate", "Acetaldehyde"] },
  { id: "other", label: "Other Derivatives", color: "#75808d", seeds: ["DMC", "Acrylates", "Amines", "Ethylamine", "Ethylbenzene", "Styrene", "PS", "ABS", "SAN", "SBR"] }
]

export function buildStreamTree(graph: StreamGraph): StreamTreeGroup[] {
  const byId = new Map<string, Material>(graph.nodes.map((node) => [node.id, node]))
  const edgesBySource = new Map<string, Edge[]>()

  for (const edge of graph.edges) {
    if (!edgesBySource.has(edge.src)) edgesBySource.set(edge.src, [])
    edgesBySource.get(edge.src)?.push(edge)
  }

  for (const [source, edges] of edgesBySource) {
    edgesBySource.set(
      source,
      edges.sort((a, b) => sortMaterial(byId.get(a.dst), byId.get(b.dst)))
    )
  }

  const rootIds = graph.nodes.filter((node) => node.depth === 0).map((node) => node.id)
  const firstLevelIds = Array.from(new Set(rootIds.flatMap((rootId) => (edgesBySource.get(rootId) || []).map((edge) => edge.dst))))
  const assigned = new Set<string>()
  const groups: StreamTreeGroup[] = []

  if (graph.stream.key === "C2") {
    for (const group of c2Groups) {
      const seedNames = new Set(group.seeds)
      const childIds = firstLevelIds.filter((id) => seedNames.has(byId.get(id)?.name || "") || hasDescendant(id, seedNames, edgesBySource, byId))
      if (!childIds.length) continue
      for (const id of childIds) assigned.add(id)
      groups.push({
        id: group.id,
        label: group.label,
        color: group.color,
        children: childIds.map((id) => buildNode(id, edgesBySource, byId, new Set(rootIds), 0))
      })
    }
  }

  const remaining = firstLevelIds.filter((id) => !assigned.has(id))
  for (const id of remaining) {
    const material = byId.get(id)
    if (!material) continue
    groups.push({
      id: `branch-${id}`,
      label: `${material.name} Chain`,
      color: "#75808d",
      children: [buildNode(id, edgesBySource, byId, new Set(rootIds), 0)]
    })
  }

  if (!groups.length) {
    return rootIds.map((id) => {
      const material = byId.get(id)
      return {
        id: `root-${id}`,
        label: material?.name || id,
        color: "#75808d",
        children: [buildNode(id, edgesBySource, byId, new Set(), 0)]
      }
    })
  }

  return groups
}

function buildNode(
  materialId: string,
  edgesBySource: Map<string, Edge[]>,
  byId: Map<string, Material>,
  seen: Set<string>,
  depth: number
): StreamTreeNode {
  const material = byId.get(materialId)
  const nextSeen = new Set(seen)
  nextSeen.add(materialId)
  const routes = edgesBySource.get(materialId) || []
  const children =
    depth >= 4
      ? []
      : routes
          .filter((edge) => !nextSeen.has(edge.dst) && byId.has(edge.dst))
          .map((edge) => buildNode(edge.dst, edgesBySource, byId, nextSeen, depth + 1))

  return {
    id: materialId,
    material: material as Material,
    routes,
    children
  }
}

function hasDescendant(startId: string, targetNames: Set<string>, edgesBySource: Map<string, Edge[]>, byId: Map<string, Material>) {
  const seen = new Set<string>([startId])
  const queue = [startId]

  while (queue.length) {
    const current = queue.shift()
    if (!current) continue
    if (targetNames.has(byId.get(current)?.name || "")) return true
    for (const edge of edgesBySource.get(current) || []) {
      if (seen.has(edge.dst)) continue
      seen.add(edge.dst)
      queue.push(edge.dst)
    }
  }

  return false
}

function sortMaterial(a?: Material, b?: Material) {
  if (!a || !b) return 0
  return a.verticalOrder - b.verticalOrder || a.name.localeCompare(b.name)
}
