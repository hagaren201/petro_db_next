import { getApplicationIconEntry, getEndUseIconEntry } from "@/lib/iconRegistry"
import type { CSSProperties } from "react"

type IconBadgeProps = {
  id?: string | null
  label?: string | null
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  type: "application" | "endUse"
}

export function IconBadge({ id, label, showLabel = true, size = "md", type }: IconBadgeProps) {
  const entry = type === "endUse" ? getEndUseIconEntry(id, label) : getApplicationIconEntry(id, label)
  const Icon = entry.icon
  const displayLabel = label || entry.shortLabel || entry.label

  return (
    <span
      className={`icon-badge icon-badge-${size}${showLabel ? "" : " icon-only"}`}
      style={{
        "--icon-bg": entry.background,
        "--icon-border": entry.border,
        "--icon-fg": entry.foreground
      } as CSSProperties}
    >
      <span className="icon-badge-mark">
        <Icon aria-hidden="true" size={size === "lg" ? 18 : size === "sm" ? 13 : 15} strokeWidth={2} />
      </span>
      {showLabel ? <span className="icon-badge-label">{displayLabel}</span> : null}
    </span>
  )
}
