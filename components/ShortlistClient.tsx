"use client"

import { Fragment, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Filter } from "lucide-react"
import type { ChainScreeningRow } from "@/lib/chainScreening"
import { formatNumber } from "@/lib/data"

const streams = ["All", "C1", "C2", "C3", "C4", "C5", "Aromatics"] as const
const sortOptions = [
  { label: "Group Score", value: "groupScore" },
  { label: "Avg. End-use Score", value: "avgEndUseScore" },
  { label: "Avg. Supply Score", value: "avgSupplyScore" },
  { label: "Material Count", value: "materialCount" }
] as const

type SortKey = (typeof sortOptions)[number]["value"]

export function ShortlistClient({ rows }: { rows: ChainScreeningRow[] }) {
  const [stream, setStream] = useState<(typeof streams)[number]>("All")
  const [sortBy, setSortBy] = useState<SortKey>("groupScore")
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return rows
      .filter((row) => stream === "All" || row.streamFilter === stream)
      .sort((a, b) => sortValue(b, sortBy) - sortValue(a, sortBy) || a.groupName.localeCompare(b.groupName))
  }, [rows, stream, sortBy])

  const evaluatedMaterialIds = new Set(rows.flatMap((row) => row.materials.map((material) => material.materialId).filter(Boolean)))
  const chainScores = rows.map((row) => row.groupScore).filter((value): value is number => value !== null)
  const summary = [
    { label: "Total chains", value: rows.length.toString() },
    { label: "Evaluated materials", value: evaluatedMaterialIds.size.toString() },
    { label: "Average group score", value: scoreText(average(chainScores)) },
    { label: "Top group score", value: scoreText(chainScores.length ? Math.max(...chainScores) : null) }
  ]

  return (
    <section className="chain-screening">
      <div className="screening-kpis">
        {summary.map((item) => (
          <article className="metric card compact-screening-kpi" key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </article>
        ))}
      </div>

      <div className="toolbar screening-filters">
        <span className="badge">
          <Filter size={14} /> Filters
        </span>
        <label>
          <span>Stream</span>
          <select className="select" value={stream} onChange={(event) => setStream(event.target.value as (typeof streams)[number])}>
            {streams.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Sort by</span>
          <select className="select" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortKey)}>
            {sortOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="table-wrap screening-table-wrap">
        <table className="screening-table">
          <thead>
            <tr>
              <th>Chain</th>
              <th>Stream</th>
              <th>Root material</th>
              <th>Materials</th>
              <th className="numeric">Group score</th>
              <th className="numeric">Avg. end-use score</th>
              <th className="numeric">Avg. supply score</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const expanded = expandedGroupId === row.groupId
              return (
                <Fragment key={row.groupId}>
                  <tr
                    className={expanded ? "expanded" : ""}
                    onClick={() => setExpandedGroupId(expanded ? null : row.groupId)}
                  >
                    <td>
                      <button className="row-button" type="button" aria-expanded={expanded}>
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <strong>{row.groupName}</strong>
                      </button>
                    </td>
                    <td>{row.streamFilter}</td>
                    <td>{row.rootMaterial || "Not mapped"}</td>
                    <td>
                      <MaterialChips row={row} />
                    </td>
                    <td className="numeric"><span className="score-emphasis">{scoreText(row.groupScore)}</span></td>
                    <td className="numeric">{scoreText(row.avgEndUseScore)}</td>
                    <td className="numeric">{scoreText(row.avgSupplyScore)}</td>
                  </tr>
                  {expanded ? (
                    <tr className="expanded-detail-row">
                      <td colSpan={7}>
                        <ExpandedChain row={row} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
            {!filtered.length ? (
              <tr>
                <td colSpan={7}>
                  <p className="muted-copy">No chains match the current filters.</p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ExpandedChain({ row }: { row: ChainScreeningRow }) {
  return (
    <div className="expanded-chain-block">
      <table className="nested-material-table">
        <thead>
          <tr>
            <th>Material</th>
            <th>Material type</th>
            <th>Starting material</th>
            <th>Root material</th>
            <th className="numeric">Total score</th>
            <th className="numeric">End-use score</th>
            <th className="numeric">Supply score</th>
          </tr>
        </thead>
        <tbody>
          {row.materials.map((material) => (
            <tr key={material.materialId}>
              <td>{material.materialName}</td>
              <td>{material.materialType || "No data"}</td>
              <td>{row.startingMaterials.length ? row.startingMaterials.join("; ") : "Not mapped"}</td>
              <td>{row.rootMaterial || "Not mapped"}</td>
              <td className="numeric">{scoreText(material.totalScore)}</td>
              <td className="numeric">{scoreText(material.endUseScore)}</td>
              <td className="numeric">{scoreText(material.supplyScore)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MaterialChips({ row }: { row: ChainScreeningRow }) {
  const visible = row.materials.slice(0, row.materials.length <= 3 ? 3 : 2)
  const hidden = Math.max(0, row.materials.length - visible.length)
  return (
    <span className="material-chip-list">
      {visible.map((material) => (
        <span className="material-chip" key={material.materialId}>{material.materialName}</span>
      ))}
      {hidden ? <span className="material-chip muted">+{hidden} more</span> : null}
    </span>
  )
}

function sortValue(row: ChainScreeningRow, key: SortKey) {
  const value = row[key]
  return typeof value === "number" && Number.isFinite(value) ? value : -Infinity
}

function scoreText(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "No data"
  return formatNumber(value, 1)
}

function average(values: number[]) {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
