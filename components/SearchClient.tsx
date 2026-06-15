"use client"

import Link from "next/link"
import { Search } from "lucide-react"
import { useMemo, useState } from "react"
import type { SearchItem } from "@/lib/types"

export function SearchClient({ index }: { index: SearchItem[] }) {
  const [query, setQuery] = useState("")
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return index.slice(0, 24)
    return index.filter((item) => `${item.title} ${item.subtitle} ${item.haystack}`.toLowerCase().includes(q)).slice(0, 80)
  }, [index, query])

  return (
    <div className="stack">
      <label className="toolbar" aria-label="Global search">
        <Search size={18} />
        <input
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search material, route, supplier, licensor, or HSK code"
        />
      </label>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Match context</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item, index) => (
              <tr key={`${item.type}-${item.title}-${index}`}>
                <td><span className="badge">{item.type}</span></td>
                <td><Link href={item.href}>{item.title}</Link></td>
                <td>{item.subtitle || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
