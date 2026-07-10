import type { LucideIcon } from "lucide-react"
import {
  Apple,
  Armchair,
  Atom,
  BatteryCharging,
  Box,
  Boxes,
  Bubbles,
  BugOff,
  Building2,
  Cable,
  Car,
  CircleDot,
  CircleDotDashed,
  CircuitBoard,
  Cog,
  Construction,
  Cpu,
  Cross,
  Droplet,
  Droplets,
  Factory,
  FlameKindling,
  FlaskConical,
  Fuel,
  Gauge,
  GitBranch,
  HandHeart,
  HardHat,
  HeartPulse,
  Layers3,
  Leaf,
  Link,
  Monitor,
  Package,
  PackageOpen,
  Paintbrush,
  PanelsTopLeft,
  Printer,
  Shield,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Sun,
  TestTube2,
  ThermometerSnowflake,
  Waves,
  Waypoints,
  Wind,
  Wrench,
  Zap
} from "lucide-react"

export type IconRegistryEntry = {
  app_id?: string
  background: string
  border: string
  end_use_id?: string
  foreground: string
  icon: LucideIcon
  label: string
  material_type?: string
  shortLabel?: string
}

export type MaterialApplicationRow = {
  app_id?: string | null
  application_taxonomy?: string | null
  rating?: number | null
  raw_application?: string | number | null
}

export type MaterialIconInput = {
  material_name?: string | null
  material_type?: string | null
  total_score?: number | null
  end_use_score?: number | null
  applications?: MaterialApplicationRow[]
}

export type MaterialIconSource = "application" | "materialType" | "fallback"

export type MaterialIconResolution = {
  application: MaterialApplicationRow | null
  entry: IconRegistryEntry
  source: MaterialIconSource
}

export type ChainIconInput = {
  group_name?: string | null
  icon_id?: string | null
}

export type ChainIconResolution = {
  entry: IconRegistryEntry
  selectedMaterial?: MaterialIconInput
  source: "explicit" | "materialFallback" | "fallback"
}

const navy = "#0B2D5B"
const orange = "#F58220"
const teal = "#008C8C"

export const fallbackIconEntry: IconRegistryEntry = {
  background: "#F8FAFC",
  border: "#CBD5E1",
  foreground: "#64748B",
  icon: CircleDotDashed,
  label: "Unknown",
  shortLabel: "Unknown"
}

export const endUseIconRegistry: IconRegistryEntry[] = [
  {
    end_use_id: "E01",
    label: "Construction & Infrastructure",
    shortLabel: "Construction",
    icon: HardHat,
    foreground: navy,
    background: "#EAF0F7",
    border: "#C9D7E8"
  },
  {
    end_use_id: "E02",
    label: "Consumer Products & Packaging",
    shortLabel: "Consumer & Packaging",
    icon: ShoppingBag,
    foreground: orange,
    background: "#FFF3E8",
    border: "#FFD8B8"
  },
  {
    end_use_id: "E03",
    label: "Automotive & Future Mobility",
    shortLabel: "Automotive & Mobility",
    icon: Car,
    foreground: "#355C7D",
    background: "#EEF4FA",
    border: "#CFDDEA"
  },
  {
    end_use_id: "E04",
    label: "Energy, Power & Utilities",
    shortLabel: "Energy & Utilities",
    icon: Zap,
    foreground: orange,
    background: "#FFF7E5",
    border: "#FFE0A3"
  },
  {
    end_use_id: "E05",
    label: "Healthcare & Life Sciences",
    shortLabel: "Healthcare",
    icon: HeartPulse,
    foreground: "#B42318",
    background: "#FFF1F0",
    border: "#FFD5D2"
  },
  {
    end_use_id: "E06",
    label: "Agriculture",
    shortLabel: "Agriculture",
    icon: Sprout,
    foreground: "#2F855A",
    background: "#ECFDF3",
    border: "#BFE8CF"
  },
  {
    end_use_id: "E07",
    label: "Industrial Goods & Advanced Manufacturing",
    shortLabel: "Industrial & Manufacturing",
    icon: Factory,
    foreground: teal,
    background: "#E6F6F6",
    border: "#BFE4E4"
  },
  {
    end_use_id: "E08",
    label: "Electronics, Semiconductors & Digital Infrastructure",
    shortLabel: "Electronics & Digital",
    icon: Cpu,
    foreground: navy,
    background: "#EEF2FF",
    border: "#D4DBFF"
  }
]

export const applicationIconRegistry: IconRegistryEntry[] = [
  app("A01", "Major chemical intermediate", FlaskConical, navy, "#EAF0F7", "#C9D7E8"),
  app("A02", "Specialty chemical intermediate", TestTube2, teal, "#E6F6F6", "#BFE4E4"),
  app("A03", "Reactive monomer / comonomer", Atom, "#5B5BD6", "#F0F0FF", "#D8D8FF"),
  app("A04", "Polymer resin / molding material", Boxes, navy, "#EAF0F7", "#C9D7E8"),
  app("A05", "Flexible packaging", PackageOpen, orange, "#FFF3E8", "#FFD8B8"),
  app("A06", "Rigid packaging", Package, orange, "#FFF3E8", "#FFD8B8"),
  app("A07", "Barrier packaging", Shield, "#476A8A", "#EEF4FA", "#CFDDEA"),
  app("A08", "Protective packaging", Box, "#476A8A", "#EEF4FA", "#CFDDEA"),
  app("A09", "Pipe & fluid conveyance", Waypoints, teal, "#E6F6F6", "#BFE4E4"),
  app("A10", "Building materials & profiles", Building2, navy, "#EAF0F7", "#C9D7E8"),
  app("A11", "Flooring & interior materials", PanelsTopLeft, "#7C5C2E", "#FFF7E8", "#F0D8AE"),
  app("A12", "Thermal insulation", ThermometerSnowflake, "#4B6E8E", "#EEF7FF", "#CFE4F6"),
  app("A13", "Electrical insulation", Cable, navy, "#EAF0F7", "#C9D7E8"),
  app("A14", "Renewable energy materials", Sun, orange, "#FFF7E5", "#FFE0A3"),
  app("A15", "Battery & thermal-management materials", BatteryCharging, teal, "#E6F6F6", "#BFE4E4"),
  app("A16", "Automotive components & lightweighting", Car, "#355C7D", "#EEF4FA", "#CFDDEA"),
  app("A17", "Cushioning & comfort materials", Armchair, "#7C5C2E", "#FFF7E8", "#F0D8AE"),
  app("A18", "Elastomeric performance materials", Waves, teal, "#E6F6F6", "#BFE4E4"),
  app("A19", "Tire & rubber applications", CircleDot, "#475569", "#F1F5F9", "#CBD5E1"),
  app("A20", "Adhesive bonding", Link, orange, "#FFF3E8", "#FFD8B8"),
  app("A21", "Sealants & joint protection", ShieldCheck, "#476A8A", "#EEF4FA", "#CFDDEA"),
  app("A22", "Surface coating", Paintbrush, "#6D5BD0", "#F1EFFF", "#DAD5FF"),
  app("A23", "Printing inks & graphic materials", Printer, navy, "#EAF0F7", "#C9D7E8"),
  app("A24", "Solvent & extraction", Droplets, teal, "#E6F6F6", "#BFE4E4"),
  app("A25", "Industrial cleaning & degreasing", Sparkles, orange, "#FFF3E8", "#FFD8B8"),
  app("A26", "Gas treatment & purification", Wind, "#476A8A", "#EEF4FA", "#CFDDEA"),
  app("A27", "Water treatment & dispersants", Waves, teal, "#E6F6F6", "#BFE4E4"),
  app("A28", "Lubrication & friction control", Gauge, "#475569", "#F1F5F9", "#CBD5E1"),
  app("A29", "Corrosion inhibition & metalworking", Wrench, "#7C5C2E", "#FFF7E8", "#F0D8AE"),
  app("A30", "Surfactant & emulsification", Bubbles, teal, "#E6F6F6", "#BFE4E4"),
  app("A31", "Personal care formulation", HandHeart, "#B42318", "#FFF1F0", "#FFD5D2"),
  app("A32", "Hygiene & absorbency", Droplet, teal, "#E6F6F6", "#BFE4E4"),
  app("A33", "Medical & healthcare materials", Cross, "#B42318", "#FFF1F0", "#FFD5D2"),
  app("A34", "Agricultural productivity materials", Sprout, "#2F855A", "#ECFDF3", "#BFE8CF"),
  app("A35", "Crop protection & agrochemical intermediates", BugOff, "#2F855A", "#ECFDF3", "#BFE8CF"),
  app("A36", "Food additives & preservation", Apple, "#B45309", "#FFF7E8", "#F0D8AE"),
  app("A37", "Cement & concrete additives", Construction, navy, "#EAF0F7", "#C9D7E8"),
  app("A38", "Polymer modification & additives", SlidersHorizontal, "#6D5BD0", "#F1EFFF", "#DAD5FF"),
  app("A39", "Flame retardancy & fire protection", FlameKindling, orange, "#FFF3E8", "#FFD8B8"),
  app("A40", "Electronic chemicals & materials", Cpu, navy, "#EEF2FF", "#D4DBFF"),
  app("A41", "Display & optical materials", Monitor, navy, "#EEF2FF", "#D4DBFF"),
  app("A42", "Composite & performance resins", Layers3, "#6D5BD0", "#F1EFFF", "#DAD5FF"),
  app("A43", "Fuel / fuel additive", Fuel, "#7C5C2E", "#FFF7E8", "#F0D8AE")
]

export const materialTypeIconRegistry: IconRegistryEntry[] = [
  materialType("Base Chemical", "Base Chemical", CircleDot, "#334155", "#F1F5F9", "#CBD5E1", "Base"),
  materialType("Functional Material", "Functional Material", SlidersHorizontal, "#6D5BD0", "#F1EFFF", "#DAD5FF", "Functional"),
  materialType("Intermediate", "Intermediate", FlaskConical, teal, "#E6F6F6", "#BFE4E4"),
  materialType("Monomer", "Monomer", Atom, "#5B5BD6", "#F0F0FF", "#D8D8FF"),
  materialType("Polymer", "Polymer", Boxes, navy, "#EAF0F7", "#C9D7E8")
]

export const genericApplicationIds = new Set(["A01", "A02", "A03"])

export function getEndUseIconEntry(id?: string | null, label?: string | null) {
  return findRegistryEntry(endUseIconRegistry, id, label, "end_use_id")
}

export function getApplicationIconEntry(id?: string | null, label?: string | null) {
  return findRegistryEntry(applicationIconRegistry, id, label, "app_id")
}

export function getMaterialTypeIconEntry(materialTypeValue?: string | null) {
  const normalizedType = normalizeMaterialType(materialTypeValue)
  if (!normalizedType) return fallbackIconEntry
  return materialTypeIconRegistry.find((entry) => normalizeMaterialType(entry.material_type) === normalizedType) ?? fallbackIconEntry
}

export function getMaterialIconEntry(material: MaterialIconInput | null | undefined, applicationRows: MaterialApplicationRow[] = []) {
  return resolveMaterialIconEntry(material, applicationRows).entry
}

export function resolveMaterialIconEntry(material: MaterialIconInput | null | undefined, applicationRows: MaterialApplicationRow[] = []): MaterialIconResolution {
  const mainApplication = selectMainApplication(applicationRows.length ? applicationRows : material?.applications ?? [])
  if (mainApplication && !isGenericApplication(mainApplication)) {
    const applicationEntry = getApplicationIconEntry(mainApplication.app_id, mainApplication.application_taxonomy)
    if (applicationEntry !== fallbackIconEntry) {
      return { application: mainApplication, entry: applicationEntry, source: "application" }
    }
  }

  const materialTypeEntry = getMaterialTypeIconEntry(material?.material_type)
  if (materialTypeEntry !== fallbackIconEntry) {
    return { application: mainApplication, entry: materialTypeEntry, source: "materialType" }
  }

  return { application: mainApplication, entry: fallbackIconEntry, source: "fallback" }
}

export function selectMainApplication(applicationRows: MaterialApplicationRow[] = []) {
  const rows = applicationRows.filter((row) => row.app_id || row.application_taxonomy || row.raw_application)
  if (!rows.length) return null
  return [...rows].sort((a, b) =>
    numericValue(b.rating) - numericValue(a.rating) ||
    stringValue(a.app_id).localeCompare(stringValue(b.app_id)) ||
    stringValue(a.raw_application).localeCompare(stringValue(b.raw_application))
  )[0]
}

export function getChainIconEntry(chain: ChainIconInput | null | undefined, materials: MaterialIconInput[] = []) {
  return resolveChainIconEntry(chain, materials).entry
}

export function resolveChainIconEntry(chain: ChainIconInput | null | undefined, materials: MaterialIconInput[] = []): ChainIconResolution {
  const explicitIconId = chain?.icon_id?.trim()
  if (explicitIconId) {
    const explicitEntry = getApplicationIconEntry(explicitIconId, null)
    if (explicitEntry !== fallbackIconEntry) return { entry: explicitEntry, source: "explicit" }
  }

  const selectedMaterial = selectChainFallbackMaterial(materials)
  if (selectedMaterial) {
    return {
      entry: getMaterialIconEntry(selectedMaterial, selectedMaterial.applications ?? []),
      selectedMaterial,
      source: "materialFallback"
    }
  }

  return { entry: fallbackIconEntry, source: "fallback" }
}

function app(app_id: string, label: string, icon: LucideIcon, foreground: string, background: string, border: string): IconRegistryEntry {
  return { app_id, label, icon, foreground, background, border }
}

function materialType(material_type: string, label: string, icon: LucideIcon, foreground: string, background: string, border: string, shortLabel?: string): IconRegistryEntry {
  return { material_type, label, icon, foreground, background, border, shortLabel }
}

function findRegistryEntry(entries: IconRegistryEntry[], id: string | null | undefined, label: string | null | undefined, idKey: "app_id" | "end_use_id") {
  const normalizedId = id?.trim().toUpperCase()
  if (normalizedId) {
    const byId = entries.find((entry) => entry[idKey]?.toUpperCase() === normalizedId)
    if (byId) return byId
  }
  const normalizedLabel = normalizeLabel(label)
  if (normalizedLabel) {
    const byLabel = entries.find((entry) => normalizeLabel(entry.label) === normalizedLabel || normalizeLabel(entry.shortLabel) === normalizedLabel)
    if (byLabel) return byLabel
  }
  return fallbackIconEntry
}

function normalizeLabel(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim() ?? ""
}

function normalizeMaterialType(value: string | null | undefined) {
  const normalized = normalizeLabel(value)
  if (!normalized) return ""
  if (normalized === "base chemical") return "base chemical"
  if (normalized === "functional material") return "functional material"
  if (normalized === "intermediate") return "intermediate"
  if (normalized === "monomer") return "monomer"
  if (normalized === "polymer") return "polymer"
  return normalized
}

function isGenericApplication(application: MaterialApplicationRow) {
  const appId = application.app_id?.trim().toUpperCase()
  return Boolean(appId && genericApplicationIds.has(appId))
}

function selectChainFallbackMaterial(materials: MaterialIconInput[]) {
  const usableMaterials = materials.filter((material) => material.material_name || material.material_type)
  if (!usableMaterials.length) return null
  const nonBaseMaterials = usableMaterials.filter((material) => normalizeMaterialType(material.material_type) !== "base chemical")
  const candidates = nonBaseMaterials.length ? nonBaseMaterials : usableMaterials
  return [...candidates].sort((a, b) => {
    const aIcon = resolveMaterialIconEntry(a, a.applications ?? [])
    const bIcon = resolveMaterialIconEntry(b, b.applications ?? [])
    const aSpecific = aIcon.source === "application" ? 1 : 0
    const bSpecific = bIcon.source === "application" ? 1 : 0
    return (
      bSpecific - aSpecific ||
      numericValue(b.end_use_score) - numericValue(a.end_use_score) ||
      numericValue(b.total_score) - numericValue(a.total_score) ||
      stringValue(a.material_name).localeCompare(stringValue(b.material_name))
    )
  })[0]
}

function numericValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : -Infinity
}

function stringValue(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : String(value).trim()
}
