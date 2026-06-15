import { formatNumber, tradeSeries } from "@/lib/data"
import type { RawTrade } from "@/lib/types"

export function TradeBars({ rows }: { rows: RawTrade[] }) {
  const series = tradeSeries(rows).slice(-8)
  const max = Math.max(1, ...series.map((row) => Math.max(row.export, row.import)))

  if (!series.length) return <div className="empty">No trade time series is mapped for this material.</div>

  return (
    <div className="trade-bars">
      {series.map((row) => (
        <div className="stack" key={row.year}>
          <div className="bar-row">
            <span>{row.year}</span>
            <span className="bar-track"><span className="bar" style={{ width: `${(row.export / max) * 100}%` }} /></span>
            <span>Ex {formatNumber(row.export, 1)}</span>
          </div>
          <div className="bar-row">
            <span></span>
            <span className="bar-track"><span className="bar import" style={{ width: `${(row.import / max) * 100}%` }} /></span>
            <span>Im {formatNumber(row.import, 1)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
