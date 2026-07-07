"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ChevronRight, Filter } from "lucide-react"
import type { ChainScreeningRow } from "@/lib/chainScreening"
import { formatNumber } from "@/lib/data"

const streams = ["All", "C1", "C2", "C3", "C4", "C5", "Aromatics"] as const

export function ShortlistClient({ rows }: { rows: ChainScreeningRow[] }) {
  const [stream, setStream] = useState<(typeof streams)[number]>("All")
  const [minimumScore, setMinimumScore] = useState("")
  const [rootSearch, setRootSearch] = useState("")
  const [chainSearch, setChainSearch] = useState("")
  const [selectedGroupId, setSelectedGroupId] = useState(rows[0]?.groupId ?? "")

  const filtered = useMemo(() => {
    const minScore = minimumScore === "" ? null : Number(minimumScore)
    return rows
      .filter((row) => stream === "All" || row.streamFilter === stream)
      .filter((row) => minScore === null || (row.groupScore !== null && row.groupScore >= minScore))
      .filter((row) => matches(row.rootMaterial, rootSearch))
      .filter((row) => matches(row.groupName, chainSearch))
  }, [rows, stream, minimumScore, rootSearch, chainSearch])

  const selected = filtered.find((row) => row.groupId === selectedGroupId) ?? filtered[0] ?? null
  const evaluatedMaterialIds = new Set(rows.flatMap((row) => row.materials.map((material) => material.materialId).filter(Boolean)))
  const chainScores = rows.map((row) => row.groupScore).filter((value): value is number => value !== null)
  const summary = [
    { label: "Total chains", value: rows.length.toString() },
    { label: "Evaluated materials", value: evaluatedMaterialIds.size.toString() },
    { label: "Average chain score", value: scoreText(average(chainScores)) },
    { label: "Top score", value: scoreText(chainScores.length ? Math.max(...chainScores) : null) }
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
          <span>Minimum group score</span>
          <input
            className="input"
            type="number"
            min={0}
            step={1}
            value={minimumScore}
            onChange={(event) => setMinimumScore(event.target.value)}
            placeholder="e.g. 80"
          />
        </label>
        <label>
          <span>Root material</span>
          <input className="input" value={rootSearch} onChange={(event) => setRootSearch(event.target.value)} placeholder="Search root" />
        </label>
        <label>
          <span>Chain name</span>
          <input className="input" value={chainSearch} onChange={(event) => setChainSearch(event.target.value)} placeholder="Search chain" />
        </label>
      </div>

      <div className="screening-layout">
        <div className="table-wrap screening-table-wrap">
          <table className="screening-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Chain</th>
                <th>Stream</th>
                <th>Root material</th>
                <th>Materials</th>
                <th className="numeric">Group score</th>
                <th className="numeric">Avg. total score</th>
                <th className="numeric">Avg. end-use score</th>
                <th className="numeric">Avg. supply score</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => (
                <tr
                  className={selected?.groupId === row.groupId ? "selected" : ""}
                  key={row.groupId}
                  onClick={() => setSelectedGroupId(row.groupId)}
                >
                  <td>{index + 1}</td>
                  <td>
                    <button className="row-button" type="button">
                      <strong>{row.groupName}</strong>
                      <small>{row.groupId}</small>
                    </button>
                  </td>
                  <td>{row.streamFilter}</td>
                  <td>{row.rootMaterial || "Not mapped"}</td>
                  <td>
                    <span className="material-preview">
                      <strong>{row.materialCount} materials</strong>
                      <small>{previewMaterials(row)}</small>
                    </span>
                  </td>
                  <td className="numeric"><span className="score-emphasis">{scoreText(row.groupScore)}</span></td>
                  <td className="numeric">{scoreText(row.avgTotalScore)}</td>
                  <td className="numeric">{scoreText(row.avgEndUseScore)}</td>
                  <td className="numeric">{scoreText(row.avgSupplyScore)}</td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={9}>
                    <p className="muted-copy">No chains match the current filters.</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <aside className="panel chain-detail-panel">
          {selected ? <ChainDetail row={selected} /> : <p className="muted-copy">Select a chain to view details.</p>}
        </aside>
      </div>
    </section>
  )
}

function ChainDetail({ row }: { row: ChainScreeningRow }) {
  return (
    <>
      <div className="chain-detail-head">
        <span className="badge">{row.streamFilter}</span>
        <h2>{row.groupName}</h2>
        <strong>{scoreText(row.groupScore)}</strong>
      </div>
      <dl className="chain-detail-meta">
        <div>
          <dt>Root material</dt>
          <dd>{row.rootMaterial || "Not mapped"}</dd>
        </div>
        <div>
          <dt>Starting material</dt>
          <dd>{row.startingMaterials.length ? row.startingMaterials.join("; ") : "Not mapped"}</dd>
        </div>
      </dl>
      <div className="detail-block">
        <h3>Materials</h3>
        <div className="detail-material-list">
          {row.materials.map((material) => (
            <Link href={`/materials/${material.materialId}`} key={material.materialId}>
              <span>
                <strong>{material.materialName}</strong>
                <small>{material.materialType || "No data"}</small>
              </span>
              <span className="material-scores">
                <small>Total {scoreText(material.totalScore)}</small>
                <small>End-use {scoreText(material.endUseScore)}</small>
                <small>Supply {scoreText(material.supplyScore)}</small>
              </span>
              <ChevronRight size={14} />
            </Link>
          ))}
        </div>
      </div>
      <DetailPills title="Key applications" values={row.applications} />
      <DetailPills title="End-use industries" values={row.endUseIndustries} />
    </>
  )
}

function DetailPills({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="detail-block">
      <h3>{title}</h3>
      {values.length ? (
        <div className="summary-pill-list">
          {values.map((value) => (
            <span key={value}>{value}</span>
          ))}
        </div>
      ) : (
        <p className="muted-copy">Not mapped</p>
      )}
    </div>
  )
}

function matches(value: string, query: string) {
  return !query.trim() || value.toLowerCase().includes(query.trim().toLowerCase())
}

function scoreText(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "No data"
  return formatNumber(value, 1)
}

function average(values: number[]) {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function previewMaterials(row: ChainScreeningRow) {
  const names = row.materials.slice(0, 3).map((material) => material.materialName)
  if (!names.length) return "Not mapped"
  const hidden = Math.max(0, row.materials.length - names.length)
  return `${names.join(", ")}${hidden ? ` +${hidden} more` : ""}`
}
