import { formatNumber } from "@/lib/data"
import type { DeployTradeSeries } from "@/lib/deployData"

type TradePoint = DeployTradeSeries["rows"][number]

export function TradeFlowChart({ series }: { series: DeployTradeSeries }) {
  const rows = series.rows.filter((row) => row.year && (row.export || row.import || row.net)).slice(-10)
  if (!rows.length) return null

  const width = 760
  const height = 250
  const pad = { bottom: 34, left: 48, right: 54, top: 20 }
  const plotWidth = width - pad.left - pad.right
  const plotHeight = height - pad.top - pad.bottom
  const maxVolume = Math.max(1, ...rows.map((row) => Math.max(row.export, row.import)))
  const maxNet = Math.max(1, ...rows.map((row) => Math.abs(row.net)))
  const groupWidth = plotWidth / rows.length
  const barWidth = Math.min(18, groupWidth * 0.24)
  const zeroY = pad.top + plotHeight / 2

  const volumeY = (value: number) => pad.top + plotHeight - (value / maxVolume) * plotHeight
  const netY = (value: number) => zeroY - (value / maxNet) * (plotHeight / 2)
  const centerX = (index: number) => pad.left + groupWidth * index + groupWidth / 2
  const linePoints = rows.map((row, index) => `${round(centerX(index))},${round(netY(row.net))}`).join(" ")
  const latest = rows.at(-1)

  return (
    <div className="trade-flow-chart">
      <div className="trade-flow-head">
        <span>Trade flow</span>
        {latest ? (
          <strong>
            {latest.year}: Ex {formatNumber(latest.export, 1)} / Im {formatNumber(latest.import, 1)} / Net {formatNumber(latest.net, 1)}
          </strong>
        ) : null}
      </div>
      <svg aria-label="Export import and net trade flow chart" role="img" viewBox={`0 0 ${width} ${height}`}>
        <line className="chart-axis" x1={pad.left} x2={width - pad.right} y1={pad.top + plotHeight} y2={pad.top + plotHeight} />
        <line className="chart-net-zero" x1={pad.left} x2={width - pad.right} y1={zeroY} y2={zeroY} />
        <text className="chart-axis-label" x={pad.left} y={14}>Volume</text>
        <text className="chart-axis-label right" x={width - pad.right} y={14}>Net</text>
        {rows.map((row, index) => {
          const x = centerX(index)
          const exportHeight = pad.top + plotHeight - volumeY(row.export)
          const importHeight = pad.top + plotHeight - volumeY(row.import)
          return (
            <g key={row.year}>
              <rect
                className="chart-bar export"
                height={round(exportHeight)}
                rx="3"
                width={barWidth}
                x={round(x - barWidth - 2)}
                y={round(volumeY(row.export))}
              />
              <rect
                className="chart-bar import"
                height={round(importHeight)}
                rx="3"
                width={barWidth}
                x={round(x + 2)}
                y={round(volumeY(row.import))}
              />
              <text className="chart-year" x={round(x)} y={height - 12}>{row.year}</text>
            </g>
          )
        })}
        <polyline className="chart-net-line" fill="none" points={linePoints} />
        {rows.map((row, index) => (
          <circle className="chart-net-point" cx={round(centerX(index))} cy={round(netY(row.net))} key={`net-${row.year}`} r="3" />
        ))}
      </svg>
      <div className="chart-legend">
        <span><i className="export" /> Export</span>
        <span><i className="import" /> Import</span>
        <span><i className="net" /> Net export</span>
      </div>
    </div>
  )
}

function round(value: number) {
  return Number(value.toFixed(3))
}
