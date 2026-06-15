import Link from "next/link"
import type { CSSProperties } from "react"
import { typeColors } from "@/lib/data"
import type { StreamGraph } from "@/lib/data"
import { TypeBadge } from "./TypeBadge"

const laneLabels = [
  "Feedstock",
  "Primary derivatives",
  "Intermediates / Monomers",
  "Polymers / Functional materials"
]

export function StreamMap({ graph }: { graph: StreamGraph }) {
  return (
    <div className="map-shell">
      <div className="lane-map">
        {graph.nodesByDepth.map(([depth, nodes]) => (
          <section className="lane-column" key={depth}>
            <div className="lane-title">{laneLabels[Math.min(depth, laneLabels.length - 1)]}</div>
            {nodes.map((node) => (
              <Link
                className="node-card"
                href={`/materials/${node.id}`}
                key={node.id}
                style={{ "--type-color": typeColors[node.type] || typeColors.Other } as CustomProperties}
                title={routeSummary(graph, node.id)}
              >
                <span className="node-name">{node.name}</span>
                <span className="node-meta">
                  <TypeBadge type={node.type} />
                  {node.subtype ? <span>{node.subtype}</span> : null}
                  {node.ccma ? <span>CCMA</span> : null}
                  {node.ceh ? <span>CEH</span> : null}
                </span>
              </Link>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

function routeSummary(graph: StreamGraph, materialId: string) {
  const edges = graph.edgesBySource[materialId] || []
  if (!edges.length) return "Open material detail"
  return edges
    .slice(0, 4)
    .map((edge) => `${edge.routeName} -> ${graph.nodes.find((node) => node.id === edge.dst)?.name || edge.dst}`)
    .join("\n")
}

type CustomProperties = CSSProperties & Record<`--${string}`, string>
