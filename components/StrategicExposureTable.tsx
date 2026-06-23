import { IconBadge } from "@/components/IconBadge"
import { formatNumber } from "@/lib/data"

export type StrategicExposureRow = {
  appId?: string | null
  application: string
  detail: string | null
  endUseId?: string | null
  endUseIndustry: string | null
  industryScore: number | null
}

type StrategicExposureTableProps = {
  exposureRows: StrategicExposureRow[]
  industryScores?: Record<string, number | null>
}

export function StrategicExposureTable({ exposureRows, industryScores = {} }: StrategicExposureTableProps) {
  const visibleRows = exposureRows.slice(0, 6)
  const hiddenRows = exposureRows.slice(6)
  const maxScore = Math.max(1, ...exposureRows.map((row) => resolveScore(row, industryScores) ?? 0))

  if (!exposureRows.length) {
    return <p className="muted-copy">No strategic exposure mapping is available.</p>
  }

  return (
    <div className="exposure-table-wrap">
      <table className="exposure-table">
        <thead>
          <tr>
            <th>Application</th>
            <th>End-use Industry</th>
            <th>Industry Score</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, index) => (
            <ExposureTableRow industryScores={industryScores} key={rowKey(row, index)} maxScore={maxScore} row={row} />
          ))}
        </tbody>
      </table>
      {hiddenRows.length ? (
        <details className="exposure-more">
          <summary>+ {hiddenRows.length} more applications</summary>
          <table className="exposure-table nested">
            <tbody>
              {hiddenRows.map((row, index) => (
                <ExposureTableRow industryScores={industryScores} key={rowKey(row, index + visibleRows.length)} maxScore={maxScore} row={row} />
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
    </div>
  )
}

function ExposureTableRow({
  industryScores,
  maxScore,
  row
}: {
  industryScores: Record<string, number | null>
  maxScore: number
  row: StrategicExposureRow
}) {
  const score = resolveScore(row, industryScores)
  const width = score === null ? 0 : Math.max(4, (score / maxScore) * 100)

  return (
    <tr>
      <td>
        <div className="exposure-app-cell">
          <IconBadge id={row.appId} label={row.application} showLabel={false} size="md" type="application" />
          <span>
            <strong>{row.application || "Unknown"}</strong>
            {row.detail ? <small className="exposure-raw-text">{row.detail}</small> : null}
          </span>
        </div>
      </td>
      <td>
        <span title={row.endUseIndustry || undefined}>
          <IconBadge id={row.endUseId} label={row.endUseIndustry} preferShortLabel size="sm" type="endUse" />
        </span>
      </td>
      <td>
        {score === null ? (
          <span className="muted-value">Unknown</span>
        ) : (
          <span className="score-bar-cell">
            <span className="score-bar-track">
              <span className="score-bar-fill" style={{ width: `${width}%` }} />
            </span>
            <strong>{formatNumber(score, 2)}</strong>
          </span>
        )}
      </td>
    </tr>
  )
}

function resolveScore(row: StrategicExposureRow, industryScores: Record<string, number | null>) {
  if (row.industryScore !== null) return row.industryScore
  if (row.endUseId && industryScores[row.endUseId] !== undefined) return industryScores[row.endUseId] ?? null
  if (row.endUseIndustry && industryScores[row.endUseIndustry] !== undefined) return industryScores[row.endUseIndustry] ?? null
  return null
}

function rowKey(row: StrategicExposureRow, index: number) {
  return `${row.appId ?? row.application}-${row.detail ?? ""}-${row.endUseId ?? row.endUseIndustry ?? ""}-${index}`
}
