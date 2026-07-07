import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import XLSX from "xlsx"

type CellValue = string | number | boolean | null
type Row = Record<string, CellValue>

const errorValues = new Set(["#REF!", "#NAME?", "#VALUE!", "#DIV/0!", "#N/A", "#NULL!", "#NUM!"])

const rootDir = process.cwd()
const sourceDir = path.join(rootDir, "data", "source")
const dbPath = path.join(sourceDir, "db.xlsx")
const tradePath = path.join(sourceDir, "trade.xlsx")
const preferredScreenPath = path.join(sourceDir, "db_screen.xlsx")
const fallbackScreenPath = path.join(sourceDir, "db_screen-old.xlsx")
const screenPath = existsSync(preferredScreenPath) ? preferredScreenPath : fallbackScreenPath
const outputPath = path.join(rootDir, "public", "data", "deploy_db.json")

function normalizeCell(value: unknown): CellValue {
  if (value === undefined || value === null) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "boolean") return value
  if (value instanceof Date) return value.toISOString()
  const text = String(value).trim()
  if (!text || errorValues.has(text.toUpperCase())) return null
  return text
}

function normalizeRow(row: Record<string, unknown>): Row {
  const normalized: Row = {}
  for (const [rawKey, rawValue] of Object.entries(row)) {
    const key = rawKey.trim()
    if (!key || key.startsWith("__EMPTY") || key.toLowerCase().startsWith("unnamed")) continue
    normalized[key] = normalizeCell(rawValue)
  }
  return normalized
}

function hasValues(row: Row) {
  return Object.values(row).some((value) => value !== null)
}

function readWorkbook(filePath: string) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing workbook: ${filePath}`)
  }
  return XLSX.readFile(filePath, {
    cellFormula: false,
    cellHTML: false,
    cellNF: false,
    cellStyles: false,
    cellText: false,
    raw: true
  } as XLSX.ParsingOptions)
}

function readSheet(workbook: XLSX.WorkBook, sheetName: string): Row[] {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []
  return XLSX.utils
    .sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true })
    .map(normalizeRow)
    .filter(hasValues)
}

function text(value: CellValue | undefined) {
  return value === undefined || value === null ? null : String(value)
}

function screenText(value: CellValue | undefined) {
  const raw = text(value)
  if (!raw) return null
  const upper = raw.trim().toUpperCase()
  if (errorValues.has(upper) || upper.includes("#REF!") || upper.includes("#NAME?")) return "N/A"
  return raw
}

function num(value: CellValue | undefined) {
  if (value === undefined || value === null || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeHsk(value: CellValue | undefined) {
  return text(value)?.replace(/\.0$/, "").replaceAll(",", "") ?? null
}

function boolFlag(value: CellValue | undefined) {
  const normalized = text(value)?.trim().toUpperCase()
  if (!normalized) return null
  if (["Y", "YES", "TRUE", "1", "O"].includes(normalized)) return true
  if (["N", "NO", "FALSE", "0", "X"].includes(normalized)) return false
  return null
}

function firstValue(row: Row, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key]
  }
  return undefined
}

function splitMultiValue(value: CellValue | undefined) {
  const raw = text(value)
  if (!raw) return []
  return raw
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
}

function addMultiValues(target: Set<string>, value: CellValue | undefined) {
  for (const item of splitMultiValue(value)) target.add(item)
}

function formatMultiValues(values: string[]) {
  return values.length ? values.join("; ") : null
}

function snakeCase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function byId(rows: Row[], idKey: string) {
  const map = new Map<string, Row>()
  for (const row of rows) {
    const id = text(row[idKey])
    if (id) map.set(id, row)
  }
  return map
}

function mostFrequent(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null
}

function inferStreamFromGroupName(groupId: string | null, groupName: string | null) {
  const value = `${groupId ?? ""} ${groupName ?? ""}`.toLowerCase()
  if (/(pe chain|eo|pet|pvc|vam|ethanol|ethanolamine)/.test(value)) return "Ethylene"
  if (/(pp chain|po\/pg|an chain|aa-sap|acrylic|oxo|ipa|pu chain|upr platform)/.test(value)) return "Propylene"
  if (/(bd rubber|isobutylene|fuel additive|1-butene|c4)/.test(value)) return "C4"
  if (/(c5|isoprene|piperylene|dcpd)/.test(value)) return "C5"
  if (/(benzene|phenol|caprolactam|aniline)/.test(value)) return "Benzene"
  if (/(toluene|tdi)/.test(value)) return "Toluene"
  if (/(xylene|px|pta|pbt|pa chain|pet resin|pet film)/.test(value)) return "Xylene"
  if (/(methanol|c1|formaldehyde|acetic acid)/.test(value)) return "Methanol"
  return null
}

function inferStartingMaterialFromGroupName(groupId: string | null, groupName: string | null) {
  const value = `${groupId ?? ""} ${groupName ?? ""}`.toLowerCase()
  if (/(pe chain|eo|pet|pvc|vam|ethanol|ethanolamine|lao|pao|ec\/dmc)/.test(value)) return "Ethylene"
  if (/(pp chain|po\/pg|an chain|aa-sap|acrylic|oxo|ipa|pu chain|upr platform)/.test(value)) return "Propylene"
  if (/(bd rubber|c4 elastomer)/.test(value)) return "Butadiene"
  if (/(isobutylene|fuel additive|mtbe|pib|butyl rubber)/.test(value)) return "Isobutylene"
  if (/(1-butene|lao)/.test(value)) return "1-Butene"
  if (/(isoprene)/.test(value)) return "Isoprene"
  if (/(piperylene)/.test(value)) return "Piperylene"
  if (/(dcpd|coc)/.test(value)) return "DCPD"
  if (/(toluene|tdi|benzoic)/.test(value)) return "Toluene"
  if (/(xylene|px|pta|pbt|pet resin|pet film|ox-pa|mx-pia)/.test(value)) return "Xylene"
  if (/(benzene|ps chain|styrene|phenol|acetone|epoxy|pc chain|aniline|mdi|lab|cyclohexane|caprolactam|nylon\/pa)/.test(value)) return "Benzene"
  if (/(methanol|c1|formaldehyde|acetic acid|mma|pmma)/.test(value)) return "Methanol"
  return null
}

function inferRepresentativeStream(group: { group_id: string | null; group_name: string | null; material_groups: string[]; base_material_groups: string[] }) {
  return inferStreamFromGroupName(group.group_id, group.group_name) ?? mostFrequent(group.base_material_groups) ?? mostFrequent(group.material_groups)
}

function inferStartingMaterial(group: { group_id: string | null; group_name: string | null; base_material_names: string[] }) {
  return inferStartingMaterialFromGroupName(group.group_id, group.group_name) ?? mostFrequent(group.base_material_names)
}

function warnBuild(message: string) {
  console.warn(`[build-db] ${message}`)
}

const dbWorkbook = readWorkbook(dbPath)
const screenWorkbook = readWorkbook(screenPath)
const tradeWorkbook = readWorkbook(tradePath)

const materialRows = readSheet(dbWorkbook, "material_master")
const routeRows = readSheet(dbWorkbook, "route_master")
const routeInputRows = readSheet(dbWorkbook, "route_input_link")
const routeOutputRows = readSheet(dbWorkbook, "route_output_link")
const supplierRows = readSheet(dbWorkbook, "supplier_master")
const materialSupplierRows = readSheet(dbWorkbook, "material_supplier_link")
const groupRows = readSheet(dbWorkbook, "group_master")
const appRows = readSheet(dbWorkbook, "app_master")
const endUseRows = readSheet(dbWorkbook, "end_use_id")
const screenRows = readSheet(screenWorkbook, "screen_master")
const tradeMapRows = readSheet(tradeWorkbook, "trade")
const rawTradeRows = readSheet(tradeWorkbook, "raw")

const screenByMaterial = byId(screenRows, "material_id")
const materialById = byId(materialRows, "material_id")
const endUseById = byId(endUseRows, "end_use_id")
const endUseByCategory = new Map(
  endUseRows
    .map((row) => [text(row.end_use_category), row] as const)
    .filter(([category]) => category)
)
const materialByName = new Map(
  materialRows
    .map((row) => [text(row.material_name)?.toLowerCase(), text(row.material_id)] as const)
    .filter(([name, id]) => name && id)
)
const materialNameSet = new Set(materialRows.map((row) => text(row.material_name)).filter(Boolean) as string[])
const baseChemicalNameSet = new Set(
  materialRows
    .filter((row) => text(row.material_type) === "Base chemical")
    .map((row) => text(row.material_name))
    .filter(Boolean) as string[]
)

const scoreRowsByMaterial = new Map<string, Row[]>()
for (const row of groupRows) {
  const materialId = text(row.material_id)
  if (!materialId) continue
  scoreRowsByMaterial.set(materialId, [...(scoreRowsByMaterial.get(materialId) ?? []), row])
}

function maxScore(rows: Row[] | undefined, key: string) {
  const values = (rows ?? []).map((row) => num(row[key])).filter((value): value is number => value !== null)
  return values.length ? Math.max(...values) : null
}

const material_card = materialRows.map((row) => {
  const materialId = text(row.material_id)
  const screen = materialId ? screenByMaterial.get(materialId) : undefined
  const scoreRows = materialId ? scoreRowsByMaterial.get(materialId) : undefined
  const sheetName = screenText(screen?.sheet_name)

  return {
    material_id: materialId,
    material_name: row.material_name ?? screenText(screen?.material_name),
    material_group: row.material_group ?? screenText(screen?.material_group),
    material_type: row.material_type ?? null,
    material_subtype: row.material_subtype ?? null,
    vertical_order: num(row.vertical_order),
    hsk10: row.hsk10 ?? screenText(screen?.hsk10),
    remarks: row.remarks ?? null,
    visual_exclude: boolFlag(row.visual_exclude),
    ccma_snp: boolFlag(row.ccma_snp),
    ceh_ceh: boolFlag(row.ceh_ceh),
    has_supplier: boolFlag(row.has_supplier ?? screen?.domestic_supplier),
    is_ulsan: boolFlag(row.is_ulsan),
    sheet_name: sheetName,
    has_page: sheetName ? true : null,
    progress: null,
    pic: null,
    product_overview: screenText(screen?.product_overview),
    production_process: screenText(screen?.production_process),
    domestic_supplier: screenText(screen?.domestic_supplier),
    domestic_supplier_names: screenText(screen?.domestic_supplier_names),
    trade_status: screenText(screen?.trade_status),
    end_use_att: maxScore(scoreRows, "end_use_att"),
    supply_value_overall_score: maxScore(scoreRows, "supply_value_overall_score"),
    total_score: maxScore(scoreRows, "total_score"),
    detail_sections: {}
  }
})

const chainGroups = new Map<
  string,
  {
    group_id: string | null
    group_name: string | null
    group_score: number | null
    is_default_visible: boolean | null
    display_order: number | null
    material_ids: Set<string>
    material_groups: string[]
    base_material_groups: string[]
    base_material_names: string[]
    starting_materials: Set<string>
    root_materials: Set<string>
    end_use_att_values: number[]
    total_score_values: number[]
  }
>()
for (const row of groupRows) {
  const groupId = text(row.group_id)
  const groupName = text(row.group_name)
  const key = groupId
  if (!key) continue
  const existing =
    chainGroups.get(key) ?? {
      group_id: groupId,
      group_name: groupName,
      group_score: null,
      is_default_visible: null,
      display_order: null,
      material_ids: new Set<string>(),
      material_groups: [],
      base_material_groups: [],
      base_material_names: [],
      starting_materials: new Set<string>(),
      root_materials: new Set<string>(),
      end_use_att_values: [],
      total_score_values: []
    }
  existing.group_name ??= groupName
  existing.group_score ??= num(row.group_score)
  addMultiValues(existing.starting_materials, row.starting_material)
  addMultiValues(existing.root_materials, row.root_material)
  const materialId = text(row.material_id)
  if (materialId) {
    existing.material_ids.add(materialId)
    const material = materialById.get(materialId)
    const materialGroup = text(material?.material_group)
    const materialName = text(material?.material_name)
    if (materialGroup) existing.material_groups.push(materialGroup)
    if (text(material?.material_type) === "Base chemical") {
      if (materialGroup) existing.base_material_groups.push(materialGroup)
      if (materialName) existing.base_material_names.push(materialName)
    }
  }
  const endUseAtt = num(row.end_use_att)
  if (endUseAtt !== null) existing.end_use_att_values.push(endUseAtt)
  const totalScore = num(row.total_score)
  if (totalScore !== null) existing.total_score_values.push(totalScore)
  chainGroups.set(key, existing)
}

const chain_master = Array.from(chainGroups.values()).map((group) => {
  const totalEndUseAtt = group.end_use_att_values.reduce((sum, value) => sum + value, 0)
  const totalMaterialScore = group.total_score_values.reduce((sum, value) => sum + value, 0)
  const relatedStreams = Array.from(new Set(group.material_groups)).sort((a, b) => a.localeCompare(b))
  const groupScore = group.group_score ?? (group.total_score_values.length ? totalMaterialScore / group.total_score_values.length : null)
  let startingMaterials = Array.from(group.starting_materials)
  if (!startingMaterials.length) {
    const inferred = inferStartingMaterial(group)
    if (inferred) {
      startingMaterials = [inferred]
      warnBuild(`starting_material inferred by fallback: ${group.group_id} ${group.group_name} -> ${inferred}`)
    }
  }
  let rootMaterials = Array.from(group.root_materials)
  if (!rootMaterials.length && startingMaterials.length) {
    rootMaterials = startingMaterials
    warnBuild(`root_material fallback to starting_material: ${group.group_id} ${group.group_name} -> ${rootMaterials.join("; ")}`)
  }
  for (const startingMaterial of startingMaterials) {
    if (!materialNameSet.has(startingMaterial)) {
      warnBuild(`starting_material not found as material: ${startingMaterial} in ${group.group_id} ${group.group_name}`)
    }
  }
  for (const rootMaterial of rootMaterials) {
    if (!baseChemicalNameSet.has(rootMaterial)) {
      warnBuild(`root_material not found as base chemical: ${rootMaterial} in ${group.group_id} ${group.group_name}`)
    }
  }
  return {
    group_id: group.group_id,
    group_name: group.group_name,
    stream: inferRepresentativeStream(group),
    related_streams: relatedStreams,
    starting_material: formatMultiValues(startingMaterials),
    starting_materials: startingMaterials,
    root_material: formatMultiValues(rootMaterials),
    root_materials: rootMaterials,
    group_score: groupScore,
    is_default_visible: groupScore !== null && groupScore > 0,
    display_order: group.display_order,
    material_count: group.material_ids.size,
    avg_total_score: group.total_score_values.length ? totalMaterialScore / group.total_score_values.length : null,
    max_total_score: group.total_score_values.length ? Math.max(...group.total_score_values) : null,
    avg_end_use_att: group.end_use_att_values.length ? totalEndUseAtt / group.end_use_att_values.length : null,
    max_end_use_att: group.end_use_att_values.length ? Math.max(...group.end_use_att_values) : null
  }
})
  .sort((a, b) => (b.group_score ?? -Infinity) - (a.group_score ?? -Infinity) || (a.group_name ?? "").localeCompare(b.group_name ?? ""))
  .map((chain, index) => ({
    ...chain,
    display_order: chain.display_order ?? index + 1
  }))

const chain_material_map = groupRows
  .map((row) => {
    const materialName = text(row.material)
    const materialId = text(row.material_id) ?? (materialName ? materialByName.get(materialName.toLowerCase()) ?? null : null)
    return {
      group_id: row.group_id ?? null,
      group_name: row.group_name ?? null,
      material_id: materialId,
      material_name: materialName,
      group_score: num(row.group_score),
      is_default_visible: num(row.group_score) !== null && (num(row.group_score) ?? 0) > 0,
      material_role: row.material_role ?? null,
      depth: num(row.depth),
      parent_material_id: row.parent_material_id ?? null,
      display_order: num(row.display_order),
      is_key_material: boolFlag(row.is_key_material),
      end_use_att: num(row.end_use_att),
      supply_value_overall_score: num(row.supply_value_overall_score),
      total_score: num(row.total_score),
      existing_value: row.exsting_value ?? null,
      market_growth_stage: row.market_growth_stage ?? null,
      supply_demand: row.supply_demand ?? null,
      supply_shortage_flag: boolFlag(row["공급부족"]),
      no_new_capacity_plan_flag: boolFlag(row["신규증설계획없음"]),
      no_china_issue_flag: boolFlag(row["중국이슈없음"]),
      import_dependency_high_flag: boolFlag(row["수입의존도 높음"])
    }
  })
  .filter((row) => row.group_id || row.group_name || row.material_id)

const routesById = byId(routeRows, "route_id")
const inputsByRoute = new Map<string, Row[]>()
const outputsByRoute = new Map<string, Row[]>()
for (const row of routeInputRows) {
  const routeId = text(row.route_id)
  if (!routeId) continue
  inputsByRoute.set(routeId, [...(inputsByRoute.get(routeId) ?? []), row])
}
for (const row of routeOutputRows) {
  const routeId = text(row.route_id)
  if (!routeId) continue
  outputsByRoute.set(routeId, [...(outputsByRoute.get(routeId) ?? []), row])
}

const route_edges = routeRows.flatMap((route) => {
  const routeId = text(route.route_id)
  if (!routeId) return []
  const inputs = inputsByRoute.get(routeId) ?? []
  const outputs = outputsByRoute.get(routeId) ?? []
  return inputs.flatMap((input) =>
    outputs.map((output) => ({
      route_id: routeId,
      route_name: route.route_name ?? null,
      route_category: route.route_category ?? null,
      route_depth: route.route_depth ?? null,
      source_material_id: input.material_id ?? null,
      target_material_id: output.material_id ?? null,
      input_role: input.input_role ?? null,
      output_role: output.output_role ?? null,
      input_seq_no: input.seq_no ?? null,
      output_seq_no: output.seq_no ?? null,
      route_remarks: route.remarks ?? null,
      input_remarks: input.remarks ?? null,
      output_remarks: output.remarks ?? null
    }))
  )
})

const app_edges = appRows.map((row) => ({
  material_id: row.material_id ?? null,
  material_name: row.material_name ?? null,
  app_id: row.app_id ?? null,
  end_use_id: row.end_use_id ?? null,
  rating: num(row.rating),
  raw_application: row["raw application"] ?? null,
  application_taxonomy: row.application_taxonomy ?? null,
  end_use_industry: row.end_use_industry ?? null,
  end_use_score: num(endUseById.get(text(row.end_use_id) ?? "")?.end_use_att) ?? num(endUseByCategory.get(text(row.end_use_industry) ?? "")?.end_use_att),
  importance: row.importance ?? null,
  reasoning: row.reasoning ?? null,
  taxonomy_action: row.taxonomy_action ?? null,
  source: row.source ?? null
}))

const supplierById = byId(supplierRows, "supplier_id")
const supplierRecordsByMaterial = new Map<string, ReturnType<typeof supplierRecord>[]>()

function supplierRecord(row: Row) {
  const supplier = supplierById.get(text(row.supplier_id) ?? "")
  return {
    supplier_id: row.supplier_id ?? null,
    supplier_name: supplier?.supplier_name ?? row["회사명"] ?? null,
    estimated_capacity: num(row.estimated_capacity),
    capacity_unit: row.capacity_unit ?? null,
    location: row.location ?? null,
    source_type: row.source_type ?? null,
    source_year: row.source_year ?? null,
    remarks: row.remarks ?? supplier?.remark ?? null
  }
}

for (const row of materialSupplierRows) {
  const materialId = text(row.material_id)
  if (!materialId) continue
  supplierRecordsByMaterial.set(materialId, [...(supplierRecordsByMaterial.get(materialId) ?? []), supplierRecord(row)])
}

const supplier_summary = Array.from(supplierRecordsByMaterial.entries()).map(([materialId, suppliers]) => {
  const names = Array.from(new Set(suppliers.map((supplier) => text(supplier.supplier_name)).filter(Boolean) as string[]))
  const locations = Array.from(new Set(suppliers.map((supplier) => text(supplier.location)).filter(Boolean) as string[]))
  const capacityUnit = text(suppliers.find((supplier) => supplier.capacity_unit)?.capacity_unit)
  const totalCapacity = suppliers.reduce((sum, supplier) => sum + (supplier.estimated_capacity ?? 0), 0)
  return {
    material_id: materialId,
    supplier_count: names.length,
    supplier_names: names,
    locations,
    total_capacity: totalCapacity || null,
    capacity_unit: capacityUnit,
    suppliers
  }
})

const tradeCodesByMaterial = new Map<string, Set<string>>()
for (const row of tradeMapRows) {
  const materialId = text(row.material_id)
  const hsk10 = normalizeHsk(row.hsk10)
  if (!materialId || !hsk10) continue
  if (!tradeCodesByMaterial.has(materialId)) tradeCodesByMaterial.set(materialId, new Set<string>())
  tradeCodesByMaterial.get(materialId)?.add(hsk10)
}

const rawTradeByHsk = new Map<string, { export: number; import: number; net: number; year: number }[]>()
for (const row of rawTradeRows) {
  const hsk10 = normalizeHsk(row.hsk10)
  const year = num(row.year)
  if (!hsk10 || year === null) continue
  const exportValue = num(row.export) ?? 0
  const importValue = num(row.import) ?? 0
  rawTradeByHsk.set(hsk10, [
    ...(rawTradeByHsk.get(hsk10) ?? []),
    {
      export: exportValue,
      import: importValue,
      net: exportValue - importValue,
      year
    }
  ])
}

const trade_series = Array.from(tradeCodesByMaterial.entries())
  .map(([materialId, hskCodes]) => {
    const byYear = new Map<number, { export: number; import: number; net: number; year: number }>()
    for (const hsk10 of hskCodes) {
      for (const row of rawTradeByHsk.get(hsk10) ?? []) {
        const existing = byYear.get(row.year) ?? { export: 0, import: 0, net: 0, year: row.year }
        existing.export += row.export
        existing.import += row.import
        existing.net = existing.export - existing.import
        byYear.set(row.year, existing)
      }
    }
    return {
      material_id: materialId,
      hsk10: Array.from(hskCodes).sort((a, b) => a.localeCompare(b)),
      rows: Array.from(byYear.values()).sort((a, b) => a.year - b.year)
    }
  })
  .filter((item) => item.rows.length)

const deployDb = {
  material_card,
  chain_master,
  chain_material_map,
  route_edges,
  app_edges,
  supplier_summary,
  trade_series
}

mkdirSync(path.dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(deployDb, null, 2)}\n`, "utf8")

console.log(`Wrote ${path.relative(rootDir, outputPath)}`)
console.log(`material_card: ${material_card.length}`)
console.log(`chain_master: ${chain_master.length}`)
console.log(`chain_material_map: ${chain_material_map.length}`)
console.log(`route_edges: ${route_edges.length}`)
console.log(`app_edges: ${app_edges.length}`)
console.log(`supplier_summary: ${supplier_summary.length}`)
console.log(`trade_series: ${trade_series.length}`)
