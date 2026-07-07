"use client"

import { useSearchParams } from "next/navigation"
import type { StreamGraph } from "@/lib/data"
import { RadialStreamMap } from "./RadialStreamMap"

export function StreamViews({
  graph
}: {
  graph: StreamGraph
}) {
  const searchParams = useSearchParams()
  const groupId = searchParams.get("group") ?? undefined

  return (
    <div className="stream-views">
      <RadialStreamMap graph={graph} initialGroupId={groupId} />
    </div>
  )
}
