import { typeColors } from "@/lib/data"

export function TypeBadge({ type }: { type: string }) {
  const color = typeColors[type] || typeColors.Other
  return (
    <span className="badge" style={{ background: `${color}1f`, color }}>
      {type || "Other"}
    </span>
  )
}
