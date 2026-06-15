"use client"

import { useState } from "react"
import type { StreamGraph } from "@/lib/data"
import type { StreamTreeGroup } from "@/lib/tree"
import { RadialStreamMap } from "./RadialStreamMap"
import { StreamMap } from "./StreamMap"
import { StreamTree } from "./StreamTree"

export function StreamViews({ graph, treeGroups }: { graph: StreamGraph; treeGroups: StreamTreeGroup[] }) {
  const [view, setView] = useState<"map" | "tree" | "lane">("map")
  const roots = graph.nodes.filter((node) => node.depth === 0)

  return (
    <div className="stream-views">
      <div className="view-switch" role="tablist" aria-label="Stream view mode">
        <button className={view === "map" ? "active" : ""} type="button" onClick={() => setView("map")}>
          Map
        </button>
        <button className={view === "tree" ? "active" : ""} type="button" onClick={() => setView("tree")}>
          Tree
        </button>
        <button className={view === "lane" ? "active" : ""} type="button" onClick={() => setView("lane")}>
          Lane
        </button>
      </div>
      {view === "map" ? <RadialStreamMap graph={graph} treeGroups={treeGroups} /> : null}
      {view === "tree" ? <StreamTree groups={treeGroups} roots={roots} /> : null}
      {view === "lane" ? <StreamMap graph={graph} /> : null}
    </div>
  )
}
