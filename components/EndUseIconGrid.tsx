import { IconBadge } from "@/components/IconBadge"

export type EndUseIconGridItem = {
  endUseId?: string | null
  label?: string | null
}

export function EndUseIconGrid({ endUses }: { endUses: EndUseIconGridItem[] }) {
  const deduped = dedupeEndUses(endUses)

  if (!deduped.length) {
    return <p className="muted-copy">No end-use industry is mapped.</p>
  }

  return (
    <div className="end-use-icon-grid">
      {deduped.map((endUse) => (
        <div className="end-use-icon-card" key={`${endUse.endUseId ?? "unknown"}-${endUse.label ?? "unknown"}`}>
          <IconBadge id={endUse.endUseId} label={endUse.label} showLabel={false} size="lg" type="endUse" />
          <span>
            <strong>{endUse.label || "Unknown"}</strong>
            {endUse.endUseId ? <small>{endUse.endUseId}</small> : null}
          </span>
        </div>
      ))}
    </div>
  )
}

function dedupeEndUses(endUses: EndUseIconGridItem[]) {
  const seen = new Set<string>()
  return endUses.filter((item) => {
    const key = `${item.endUseId ?? ""}|${item.label ?? ""}`.toLowerCase()
    if (!item.endUseId && !item.label) return false
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
