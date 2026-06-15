import Link from "next/link"
import type { CSSProperties } from "react"
import { ArrowRight } from "lucide-react"
import { typeColors } from "@/lib/data"
import type { StreamGraph } from "@/lib/data"
import { TypeBadge } from "./TypeBadge"

export function StreamMap({ graph }: { graph: StreamGraph }) {
  return (
    <div className="map-shell">
      <div className="lane-map">
        {graph.nodesByDepth.map(([depth, nodes]) => (
          <section className="lane-column" key={depth}>
            <div className="lane-title">{depth === 0 ? "Base chemicals" : `Depth ${depth}`}</div>
            {nodes.map((node) => (
              <Link
                className="node-card"
                href={`/materials/${node.id}`}
                key={node.id}
                style={{ "--type-color": typeColors[node.type] || typeColors.Other } as CSSProperties}
              >
                <span className="node-name">{node.name}</span>
                <span className="node-meta">
                  <TypeBadge type={node.type} />
                  {node.subtype ? <span>{node.subtype}</span> : null}
                  {node.ccma ? <span>CCMA</span> : null}
                  {node.ceh ? <span>CEH</span> : null}
                </span>
                {graph.edgesBySource[node.id]?.length ? (
                  <span className="routes">
                    {graph.edgesBySource[node.id].slice(0, 3).map((edge) => (
                      <span className="route-chip" key={`${edge.routeId}-${edge.dst}`}>
                        <span>
                          <ArrowRight size={13} /> {edge.routeName}
                        </span>
                        <span>to {graph.nodes.find((n) => n.id === edge.dst)?.name || edge.dst}</span>
                      </span>
                    ))}
                  </span>
                ) : null}
              </Link>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
