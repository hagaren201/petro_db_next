import { deployDb } from "./deployData"

export type ChainScreeningMaterial = {
  materialId: string
  materialName: string
  materialType: string | null
  totalScore: number | null
  endUseScore: number | null
  supplyScore: number | null
}

export type ChainScreeningRow = {
  groupId: string
  groupName: string
  stream: string
  streamFilter: "C1" | "C2" | "C3" | "C4" | "C5" | "Aromatics" | "Other"
  rootMaterial: string
  startingMaterials: string[]
  groupScore: number | null
  avgTotalScore: number | null
  maxTotalScore: number | null
  avgEndUseScore: number | null
  avgSupplyScore: number | null
  materialCount: number
  materials: ChainScreeningMaterial[]
  applications: string[]
  endUseIndustries: string[]
}

const streamLabels: Record<string, ChainScreeningRow["streamFilter"]> = {
  Methanol: "C1",
  C1: "C1",
  Ethylene: "C2",
  C2: "C2",
  Propylene: "C3",
  C3: "C3",
  C4: "C4",
  C5: "C5",
  Benzene: "Aromatics",
  Toluene: "Aromatics",
  Xylene: "Aromatics",
  Aromatics: "Aromatics"
}

export function buildChainScreeningRows(): ChainScreeningRow[] {
  const materialCards = new Map(deployDb.material_card.map((card) => [card.material_id, card]))
  const appRowsByMaterial = new Map<string, typeof deployDb.app_edges>()
  for (const app of deployDb.app_edges) {
    if (!app.material_id) continue
    appRowsByMaterial.set(app.material_id, [...(appRowsByMaterial.get(app.material_id) ?? []), app])
  }

  return deployDb.chain_master
    .map((chain) => {
      const groupId = chain.group_id ?? ""
      const materialRows = deployDb.chain_material_map.filter((row) => row.group_id === chain.group_id && row.material_id)
      const materials = materialRows.map((row) => {
        const card = materialCards.get(row.material_id)
        return {
          materialId: row.material_id ?? "",
          materialName: row.material_name ?? card?.material_name ?? row.material_id ?? "Unknown",
          materialType: card?.material_type ?? null,
          totalScore: row.total_score ?? card?.total_score ?? null,
          endUseScore: row.end_use_att ?? card?.end_use_att ?? null,
          supplyScore: row.supply_value_overall_score ?? card?.supply_value_overall_score ?? null
        }
      })
      const totalScores = materials.map((material) => material.totalScore).filter(isNumber)
      const endUseScores = materials.map((material) => material.endUseScore).filter(isNumber)
      const supplyScores = materials.map((material) => material.supplyScore).filter(isNumber)
      const materialIds = new Set(materials.map((material) => material.materialId).filter(Boolean))
      const appRows = Array.from(materialIds).flatMap((id) => appRowsByMaterial.get(id) ?? [])
      const stream = chain.stream ?? chain.related_streams?.[0] ?? "Other"

      return {
        groupId,
        groupName: chain.group_name ?? (groupId || "Unnamed chain"),
        stream,
        streamFilter: streamLabels[stream] ?? "Other",
        rootMaterial: chain.root_material ?? chain.root_materials?.join("; ") ?? "Not mapped",
        startingMaterials: chain.starting_materials ?? [],
        groupScore: chain.group_score ?? average(totalScores),
        avgTotalScore: chain.avg_total_score ?? average(totalScores),
        maxTotalScore: chain.max_total_score ?? max(totalScores),
        avgEndUseScore: chain.avg_end_use_att ?? average(endUseScores),
        avgSupplyScore: average(supplyScores),
        materialCount: chain.material_count || materials.length,
        materials,
        applications: topLabels(appRows.map((row) => row.application_taxonomy ?? row.raw_application)),
        endUseIndustries: topLabels(appRows.map((row) => row.end_use_industry))
      }
    })
    .sort((a, b) => (b.groupScore ?? -Infinity) - (a.groupScore ?? -Infinity) || a.groupName.localeCompare(b.groupName))
}

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function average(values: number[]) {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function max(values: number[]) {
  if (!values.length) return null
  return Math.max(...values)
}

function topLabels(values: Array<string | number | null | undefined>) {
  const counts = new Map<string, number>()
  for (const value of values) {
    if (!value) continue
    const label = String(value)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([label]) => label)
}
