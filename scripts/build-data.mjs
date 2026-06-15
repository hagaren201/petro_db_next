import fs from "node:fs"
import path from "node:path"
import xlsx from "xlsx"

const root = process.cwd()
const dbPath = path.join(root, "data", "source", "db.xlsx")
const tradePath = path.join(root, "data", "source", "trade.xlsx")
const outDir = path.join(root, "data", "generated")
const outPath = path.join(outDir, "petro-data.json")

const streamDefs = [
  { slug: "c2", key: "C2", label: "C2 / Ethylene", category: "Ethylene", roots: ["Ethylene"], color: "#2563eb" },
  { slug: "c3", key: "C3", label: "C3 / Propylene", category: "Propylene", roots: ["Propylene"], color: "#d97706" },
  { slug: "c4", key: "C4", label: "C4", category: "C4", roots: ["Butadiene", "1-Butene", "Isobutylene"], color: "#16a34a" },
  { slug: "c5", key: "C5", label: "C5", category: "C5", roots: ["Isoprene", "Piperylene", "DCPD"], color: "#65a30d" },
  { slug: "aromatics", key: "Aromatics", label: "Aromatics", category: "Aromatics", roots: ["Benzene", "Toluene", "Xylene"], color: "#dc2626" },
  { slug: "methanol", key: "C1", label: "Methanol / C1", category: "Methanol", roots: ["Methanol"], color: "#7c3aed" }
]

const aromaticsGroups = new Set(["Aromatics", "Benzene", "Toluene", "Xylene"])
const categoryOrder = { Ethylene: 1, Propylene: 2, C4: 3, C5: 4, Aromatics: 5, Methanol: 6 }

function cleanText(value) {
  if (value === null || value === undefined) return ""
  const text = String(value).trim()
  if (text === "NaN" || text === "nan") return ""
  return text
}

function cleanSheet(file, sheet) {
  const workbook = xlsx.readFile(file, { cellDates: false })
  if (!workbook.SheetNames.includes(sheet)) return []
  return xlsx.utils.sheet_to_json(workbook.Sheets[sheet], { defval: "" }).map((row) => {
    const cleaned = {}
    for (const [key, value] of Object.entries(row)) {
      const col = cleanText(key)
      if (!col || col.startsWith("Unnamed")) continue
      cleaned[col] = cleanText(value)
    }
    return cleaned
  })
}

function sheetNames(file) {
  return xlsx.readFile(file, { bookSheets: true }).SheetNames
}

function normalizeHsk(value) {
  return cleanText(value).replace(/\.0$/, "").replaceAll(",", "")
}

function safeNum(value) {
  const n = Number(cleanText(value).replaceAll(",", ""))
  return Number.isFinite(n) ? n : 0
}

function isYes(value) {
  return ["Y", "O", "YES", "TRUE", "1"].includes(cleanText(value).toUpperCase())
}

function normalizeCategory(group) {
  const text = cleanText(group)
  if (aromaticsGroups.has(text)) return "Aromatics"
  if (text === "C1") return "Methanol"
  return text
}

function uniqueBy(items, keyFn) {
  const seen = new Set()
  const out = []
  for (const item of items) {
    const key = keyFn(item)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

const dbSheets = sheetNames(dbPath)
for (const required of ["material_master", "route_master", "route_input_link", "route_output_link"]) {
  if (!dbSheets.includes(required)) throw new Error(`db.xlsx missing required sheet: ${required}`)
}

const materialRows = cleanSheet(dbPath, "material_master")
const routeRows = cleanSheet(dbPath, "route_master")
const inputRows = cleanSheet(dbPath, "route_input_link")
const outputRows = cleanSheet(dbPath, "route_output_link")
const licensorRows = cleanSheet(dbPath, "licensor_master")
const routeLicensorRows = cleanSheet(dbPath, "route_licensor_link")
const supplierRows = cleanSheet(dbPath, "supplier_master")
const materialSupplierRows = cleanSheet(dbPath, "material_supplier_link")

const materials = materialRows
  .filter((row) => row.material_id)
  .map((row) => ({
    id: row.material_id,
    group: row.material_group || "",
    category: normalizeCategory(row.material_group),
    name: row.material_name || row.material_id,
    type: row.material_type || "",
    subtype: row.material_subtype || "",
    verticalOrder: safeNum(row.vertical_order) || 9999,
    hsk10: normalizeHsk(row.hsk10),
    remarks: row.remarks || "",
    visualExclude: isYes(row.visual_exclude),
    ccma: isYes(row.ccma_snp),
    ceh: isYes(row.ceh_ceh),
    hasSupplierFlag: isYes(row.has_supplier),
    isUlsanFlag: isYes(row.is_ulsan)
  }))

const materialById = Object.fromEntries(materials.map((m) => [m.id, m]))
const materialIdByName = Object.fromEntries(materials.map((m) => [m.name, m.id]))

const routes = routeRows
  .filter((row) => row.route_id)
  .map((row) => ({
    id: row.route_id,
    name: row.route_name || row.route_id,
    category: row.route_category || "",
    depth: row.route_depth || "",
    remarks: row.remarks || ""
  }))
const routeById = Object.fromEntries(routes.map((r) => [r.id, r]))

const licensorById = Object.fromEntries(
  licensorRows
    .filter((row) => row.licensor_id)
    .map((row) => [
      row.licensor_id,
      { id: row.licensor_id, name: row.licensor_name || row.licensor_id, remarks: row.remarks || "" }
    ])
)

const routeLicensors = {}
for (const row of routeLicensorRows) {
  const routeId = row.route_id
  const licensorId = row.licensor_id
  if (!routeId || !licensorId) continue
  routeLicensors[routeId] ??= []
  const lic = licensorById[licensorId] || { id: licensorId, name: licensorId, remarks: "" }
  routeLicensors[routeId].push({ ...lic, linkRemarks: row.remarks || "" })
}
for (const routeId of Object.keys(routeLicensors)) {
  routeLicensors[routeId] = uniqueBy(routeLicensors[routeId], (x) => `${x.id}|${x.name}`).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}

const supplierById = Object.fromEntries(
  supplierRows
    .filter((row) => row.supplier_id)
    .map((row) => [
      row.supplier_id,
      { id: row.supplier_id, name: row.supplier_name || row.supplier_id, remarks: row.remarks || row.remark || "" }
    ])
)

const materialSuppliers = {}
for (const row of materialSupplierRows) {
  const materialId = row.material_id
  const supplierId = row.supplier_id
  if (!materialId || !supplierId) continue
  materialSuppliers[materialId] ??= []
  const supplier = supplierById[supplierId] || { id: supplierId, name: supplierId, remarks: "" }
  materialSuppliers[materialId].push({
    supplierId,
    supplierName: supplier.name,
    estimatedCapacity: row.estimated_capacity || "",
    capacityValue: safeNum(row.estimated_capacity),
    capacityUnit: row.capacity_unit || "",
    location: row.location || "",
    sourceType: row.source_type || "",
    sourceYear: row.source_year || "",
    remarks: row.remarks || row.remark || ""
  })
}
for (const materialId of Object.keys(materialSuppliers)) {
  materialSuppliers[materialId] = uniqueBy(
    materialSuppliers[materialId],
    (x) => `${x.supplierId}|${x.location}|${x.estimatedCapacity}|${x.capacityUnit}|${x.remarks}`
  ).sort((a, b) => `${a.supplierName}${a.location}`.localeCompare(`${b.supplierName}${b.location}`))
}

const routeInputs = {}
const routeOutputs = {}
for (const row of inputRows) {
  if (!row.route_id || !row.material_id) continue
  routeInputs[row.route_id] ??= []
  routeInputs[row.route_id].push({ materialId: row.material_id, inputRole: row.input_role || "", seqNo: row.seq_no || "", remarks: row.remarks || "" })
}
for (const row of outputRows) {
  if (!row.route_id || !row.material_id) continue
  routeOutputs[row.route_id] ??= []
  routeOutputs[row.route_id].push({ materialId: row.material_id, outputRole: row.output_role || "", seqNo: row.seq_no || "", remarks: row.remarks || "" })
}

const edges = []
for (const routeId of Array.from(new Set([...Object.keys(routeInputs), ...Object.keys(routeOutputs)])).sort()) {
  for (const input of routeInputs[routeId] || []) {
    for (const output of routeOutputs[routeId] || []) {
      if (!materialById[input.materialId] || !materialById[output.materialId]) continue
      edges.push({
        src: input.materialId,
        dst: output.materialId,
        routeId,
        routeName: routeById[routeId]?.name || routeId,
        routeCategory: routeById[routeId]?.category || "",
        inputRole: input.inputRole,
        outputRole: output.outputRole,
        licensors: routeLicensors[routeId] || []
      })
    }
  }
}

const outputLicensorMap = {}
for (const row of outputRows) {
  if (!row.material_id || !row.route_id) continue
  outputLicensorMap[row.material_id] ??= new Set()
  for (const lic of routeLicensors[row.route_id] || []) outputLicensorMap[row.material_id].add(lic.name)
}
const outputLicensors = Object.fromEntries(Object.entries(outputLicensorMap).map(([k, set]) => [k, Array.from(set).sort()]))

const supplierInfoByMaterial = {}
for (const material of materials) {
  const items = materialSuppliers[material.id] || []
  const supplierNames = Array.from(new Set(items.map((x) => x.supplierName).filter(Boolean))).sort()
  const ulsanSupplierNames = Array.from(
    new Set(items.filter((x) => x.location.includes("울산") || x.location.toLowerCase().includes("ulsan")).map((x) => x.supplierName))
  ).sort()
  const capacities = items
    .filter((x) => x.estimatedCapacity)
    .map((x) => `${x.supplierName}: ${x.estimatedCapacity} ${x.capacityUnit}`.trim())
  supplierInfoByMaterial[material.id] = {
    hasDomesticSupplier: supplierNames.length > 0,
    hasUlsanSupplier: ulsanSupplierNames.length > 0,
    domesticSupplierNames: supplierNames.join(", ") || "X",
    ulsanSupplierNames: ulsanSupplierNames.join(", ") || "X",
    domesticCapacity: capacities.join("; ") || "X",
    totalCapacity: items.reduce((sum, x) => sum + x.capacityValue, 0),
    capacityUnit: items.find((x) => x.capacityUnit)?.capacityUnit || "",
    locations: Array.from(new Set(items.map((x) => x.location).filter(Boolean))).sort()
  }
}

const tradeSheets = sheetNames(tradePath)
if (!tradeSheets.includes("trade") || !tradeSheets.includes("raw")) {
  throw new Error("trade.xlsx must include trade and raw sheets")
}

const tradeMapRows = cleanSheet(tradePath, "trade").map((row) => ({ ...row, hsk10: normalizeHsk(row.hsk10) }))
const rawTrade = cleanSheet(tradePath, "raw").map((row) => ({
  year: safeNum(row.year),
  hsk10: normalizeHsk(row.hsk10),
  materialNameHsk: row.material_name_hsk || "",
  export: safeNum(row.export),
  import: safeNum(row.import),
  diff: safeNum(row.diff),
  exportImport: row["export/import"] || "",
  balanceIndex: safeNum(row.balance_index)
}))

function buildTradeSummary(threshold = 0) {
  const grouped = new Map()
  for (const row of rawTrade.filter((x) => x.hsk10)) {
    grouped.set(row.hsk10, [...(grouped.get(row.hsk10) || []), row])
  }
  const byHsk = {}
  for (const [hsk10, rows] of grouped.entries()) {
    rows.sort((a, b) => a.year - b.year)
    const latest = rows.at(-1)
    const signs = rows.map((row) => {
      const net = row.export - row.import
      if (Math.abs(net) <= threshold) return 0
      return net > 0 ? 1 : -1
    })
    const nonZero = signs.filter((x) => x !== 0)
    let regime = "Balanced"
    if (nonZero.length && nonZero.every((x) => x > 0)) regime = "Stable exporter"
    else if (nonZero.length && nonZero.every((x) => x < 0)) regime = "Stable importer"
    else if (nonZero[0] > 0 && nonZero.at(-1) < 0) regime = "Exporter -> importer"
    else if (nonZero[0] < 0 && nonZero.at(-1) > 0) regime = "Importer -> exporter"
    else if (nonZero.length) regime = "Mixed / volatile"
    const net = latest.export - latest.import
    const status = Math.abs(net) <= threshold ? "Balanced" : net > 0 ? "Net export" : "Net import"
    byHsk[hsk10] = {
      latestYear: latest.year,
      exportLatest: latest.export,
      importLatest: latest.import,
      netLatest: net,
      tradeRegime: regime,
      tradeStatus: status,
      turnFlag: regime.includes("->") ? "Y" : "N",
      tradeKey: { "Net import": 1, Balanced: 2, "Net export": 3 }[status] || 9
    }
  }
  return tradeMapRows.map((row) => {
    const summary = byHsk[row.hsk10]
    return {
      materialId: row.material_id || "",
      hsk10: row.hsk10 || "",
      materialName: row.material_name || "",
      materialNameHsk: row.material_name_hsk || "",
      latestYear: summary?.latestYear ?? null,
      exportLatest: summary?.exportLatest ?? null,
      importLatest: summary?.importLatest ?? null,
      netLatest: summary?.netLatest ?? null,
      tradeRegime: summary?.tradeRegime ?? "No trade data",
      tradeStatus: summary?.tradeStatus ?? "No trade data",
      turnFlag: summary?.turnFlag ?? "N",
      tradeKey: summary?.tradeKey ?? 4
    }
  })
}

const tradeSummary = buildTradeSummary(0)
const tradeSummaryByMaterial = new Map()
for (const row of tradeSummary) {
  if (!row.materialId || tradeSummaryByMaterial.has(row.materialId)) continue
  tradeSummaryByMaterial.set(row.materialId, row)
}

const shortlist = materials
  .map((material) => {
    const licensors = outputLicensors[material.id] || []
    const licensorList = licensors.join(", ")
    const trade = tradeSummaryByMaterial.get(material.id)
    const licensable = licensors.length > 0
    const hasDomestic = supplierInfoByMaterial[material.id]?.hasDomesticSupplier || false
    const axensLummus = /axens|lummus/i.test(licensorList)
    const tradeStatus = trade?.tradeStatus || "No trade data"
    let priority = "E"
    if (licensable && axensLummus && tradeStatus === "Net import") priority = "A"
    else if (licensable && axensLummus && ["No trade data", "Net export", "Balanced"].includes(tradeStatus) && hasDomestic) priority = "B"
    else if (licensable && !axensLummus && tradeStatus === "Net import") priority = "C"
    else if (licensable && !axensLummus && ["No trade data", "Net export", "Balanced"].includes(tradeStatus) && hasDomestic) priority = "D"
    return {
      materialId: material.id,
      materialName: material.name,
      categoryDisplay: material.category,
      categoryOrder: categoryOrder[material.category] || 99,
      materialType: material.type,
      licensorList,
      licensable: licensable ? "Y" : "N",
      hasDomesticSupplier: hasDomestic ? "Y" : "N",
      hasUlsanSupplier: supplierInfoByMaterial[material.id]?.hasUlsanSupplier ? "Y" : "N",
      domesticSupplier: supplierInfoByMaterial[material.id]?.domesticSupplierNames || "X",
      ulsanSupplier: supplierInfoByMaterial[material.id]?.ulsanSupplierNames || "X",
      domesticCapacity: supplierInfoByMaterial[material.id]?.domesticCapacity || "X",
      domesticSupplierDisplay:
        supplierInfoByMaterial[material.id]?.domesticSupplierNames &&
        supplierInfoByMaterial[material.id].domesticSupplierNames !== "X" &&
        supplierInfoByMaterial[material.id].domesticCapacity !== "X"
          ? `${supplierInfoByMaterial[material.id].domesticSupplierNames} (${supplierInfoByMaterial[material.id].domesticCapacity})`
          : supplierInfoByMaterial[material.id]?.domesticSupplierNames || "X",
      hsk10: trade?.hsk10 || material.hsk10 || "",
      materialNameHsk: trade?.materialNameHsk || "",
      latestYear: trade?.latestYear ?? null,
      exportLatest: trade?.exportLatest ?? null,
      importLatest: trade?.importLatest ?? null,
      netLatest: trade?.netLatest ?? null,
      tradeStatus,
      tradeRegime: trade?.tradeRegime || "No trade data",
      turnFlag: trade?.turnFlag || "N",
      tradeKey: trade?.tradeKey || 4,
      axensLummusFlag: axensLummus ? "Y" : "N",
      priority,
      priorityRank: { A: 1, B: 2, C: 3, D: 4, E: 5 }[priority]
    }
  })
  .sort((a, b) => a.priorityRank - b.priorityRank || a.categoryOrder - b.categoryOrder || a.materialName.localeCompare(b.materialName))

const searchIndex = [
  ...materials.map((m) => ({
    type: "Material",
    title: m.name,
    subtitle: [m.category, m.type, m.hsk10].filter(Boolean).join(" / "),
    materialId: m.id,
    href: `/materials/${m.id}`,
    haystack: [m.id, m.name, m.group, m.type, m.subtype, m.hsk10, m.remarks].join(" ")
  })),
  ...routes.map((r) => ({
    type: "Route",
    title: r.name,
    subtitle: [r.id, r.category].filter(Boolean).join(" / "),
    href: `/search?route=${encodeURIComponent(r.id)}`,
    haystack: [r.id, r.name, r.category, r.remarks, ...(routeLicensors[r.id] || []).map((x) => x.name)].join(" ")
  })),
  ...Object.entries(supplierById).map(([id, s]) => ({
    type: "Supplier",
    title: s.name,
    subtitle: id,
    href: `/search?supplier=${encodeURIComponent(s.name)}`,
    haystack: [id, s.name, s.remarks].join(" ")
  })),
  ...Object.entries(licensorById).map(([id, l]) => ({
    type: "Licensor",
    title: l.name,
    subtitle: id,
    href: `/search?licensor=${encodeURIComponent(l.name)}`,
    haystack: [id, l.name, l.remarks].join(" ")
  }))
]

const sourceStats = {
  generatedAt: new Date().toISOString(),
  dbWorkbook: "data/source/db.xlsx",
  tradeWorkbook: "data/source/trade.xlsx",
  materialCount: materials.length,
  routeCount: routes.length,
  edgeCount: edges.length,
  supplierCount: Object.keys(supplierById).length,
  licensorCount: Object.keys(licensorById).length,
  tradeCodeCount: tradeMapRows.length
}

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      sourceStats,
      streamDefs,
      materials,
      routes,
      routeInputs,
      routeOutputs,
      edges,
      routeLicensors,
      outputLicensors,
      supplierById,
      materialSuppliers,
      supplierInfoByMaterial,
      tradeSummary,
      rawTrade,
      shortlist,
      searchIndex
    },
    null,
    2
  )
)

console.log(`Generated ${path.relative(root, outPath)} from ${materials.length} materials, ${routes.length} routes, ${rawTrade.length} trade rows.`)
