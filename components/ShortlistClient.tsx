"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ChevronRight, Filter } from "lucide-react"
import type { ShortlistRow } from "@/lib/types"
import { formatNumber } from "@/lib/data"

const tradeOptions = ["Net import", "Balanced", "Net export", "No trade data"] as const
const priorities = ["A", "B", "C", "D", "E"] as const

export function ShortlistClient({ rows }: { rows: ShortlistRow[] }) {
  const [category, setCategory] = useState("All")
  const [licensableOnly, setLicensableOnly] = useState(true)
  const [tradeStatus, setTradeStatus] = useState("Net import,No trade data")
  const [priority, setPriority] = useState("A,B,C,D")
  const [netThreshold, setNetThreshold] = useState(0)

  const categories = useMemo(() => ["All", ...Array.from(new Set(rows.map((row) => row.categoryDisplay))).sort()], [rows])
  const selectedTrades = tradeStatus ? tradeStatus.split(",") : []
  const selectedPriorities = priority ? priority.split(",") : []

  const filtered = useMemo(() => {
    return rows
      .filter((row) => category === "All" || row.categoryDisplay === category)
      .filter((row) => !licensableOnly || row.licensable === "Y")
      .filter((row) => !selectedTrades.length || selectedTrades.includes(row.tradeStatus))
      .filter((row) => !selectedPriorities.length || selectedPriorities.includes(row.priority))
      .filter((row) => Math.abs(row.netLatest || 0) >= netThreshold || row.netLatest === null)
  }, [rows, category, licensableOnly, selectedTrades, selectedPriorities, netThreshold])

  const counts = priorities.map((p) => [p, filtered.filter((row) => row.priority === p).length] as const)

  function toggleMulti(value: string, selected: string, setSelected: (value: string) => void) {
    const parts = selected ? selected.split(",") : []
    const next = parts.includes(value) ? parts.filter((x) => x !== value) : [...parts, value]
    setSelected(next.join(","))
  }

  return (
    <>
      <div className="toolbar">
        <span className="badge">
          <Filter size={14} /> Filters
        </span>
        <select className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <label className="checkbox">
          <input type="checkbox" checked={licensableOnly} onChange={(event) => setLicensableOnly(event.target.checked)} />
          Licensable only
        </label>
        <input
          className="input"
          type="number"
          min={0}
          step={100}
          value={netThreshold}
          onChange={(event) => setNetThreshold(Number(event.target.value))}
          aria-label="Net trade threshold"
          placeholder="Net trade threshold"
        />
      </div>
      <div className="toolbar">
        {tradeOptions.map((item) => (
          <button className="button" type="button" key={item} onClick={() => toggleMulti(item, tradeStatus, setTradeStatus)}>
            <input readOnly type="checkbox" checked={selectedTrades.includes(item)} />
            {item}
          </button>
        ))}
      </div>
      <div className="toolbar">
        {priorities.map((item) => (
          <button className="button" type="button" key={item} onClick={() => toggleMulti(item, priority, setPriority)}>
            <input readOnly type="checkbox" checked={selectedPriorities.includes(item)} />
            Priority {item}
          </button>
        ))}
      </div>

      <div className="grid section">
        {counts.slice(0, 4).map(([label, count]) => (
          <div className="metric card" key={label}>
            <strong>{count}</strong>
            <span>Priority {label}</span>
          </div>
        ))}
      </div>

      <div className="table-wrap section">
        <table>
          <thead>
            <tr>
              <th>Priority</th>
              <th>Category</th>
              <th>Product</th>
              <th>Type</th>
              <th>Licensors</th>
              <th>Domestic supplier</th>
              <th>Trade</th>
              <th>Net latest</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.materialId}>
                <td><span className="badge">Priority {row.priority}</span></td>
                <td>{row.categoryDisplay}</td>
                <td>{row.materialName}</td>
                <td>{row.materialType}</td>
                <td>{row.licensorList || "-"}</td>
                <td>{row.domesticSupplierDisplay}</td>
                <td>{row.tradeStatus}</td>
                <td>{formatNumber(row.netLatest, 1)}</td>
                <td>
                  <Link className="button" href={`/materials/${row.materialId}`} aria-label={`Open ${row.materialName}`}>
                    <ChevronRight size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
