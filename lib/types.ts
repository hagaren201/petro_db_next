export type StreamDefinition = {
  slug: string
  key: string
  label: string
  category: string
  roots: string[]
  color: string
}

export type Material = {
  id: string
  group: string
  category: string
  name: string
  type: string
  subtype: string
  verticalOrder: number
  hsk10: string
  remarks: string
  visualExclude: boolean
  ccma: boolean
  ceh: boolean
  hasSupplierFlag: boolean
  isUlsanFlag: boolean
}

export type Route = {
  id: string
  name: string
  category: string
  depth: string
  remarks: string
}

export type Licensor = {
  id: string
  name: string
  remarks: string
  linkRemarks?: string
}

export type Edge = {
  src: string
  dst: string
  routeId: string
  routeName: string
  routeCategory: string
  inputRole: string
  outputRole: string
  licensors: Licensor[]
}

export type SupplierItem = {
  supplierId: string
  supplierName: string
  estimatedCapacity: string
  capacityValue: number
  capacityUnit: string
  location: string
  sourceType: string
  sourceYear: string
  remarks: string
}

export type SupplierInfo = {
  hasDomesticSupplier: boolean
  hasUlsanSupplier: boolean
  domesticSupplierNames: string
  ulsanSupplierNames: string
  domesticCapacity: string
  totalCapacity: number
  capacityUnit: string
  locations: string[]
}

export type TradeSummary = {
  materialId: string
  hsk10: string
  materialName: string
  materialNameHsk: string
  latestYear: number | null
  exportLatest: number | null
  importLatest: number | null
  netLatest: number | null
  tradeRegime: string
  tradeStatus: "Net import" | "Balanced" | "Net export" | "No trade data"
  turnFlag: string
  tradeKey: number
}

export type RawTrade = {
  year: number
  hsk10: string
  materialNameHsk: string
  export: number
  import: number
  diff: number
  exportImport: string
  balanceIndex: number
}

export type ShortlistRow = {
  materialId: string
  materialName: string
  categoryDisplay: string
  categoryOrder: number
  materialType: string
  licensorList: string
  licensable: "Y" | "N"
  hasDomesticSupplier: "Y" | "N"
  hasUlsanSupplier: "Y" | "N"
  domesticSupplier: string
  ulsanSupplier: string
  domesticCapacity: string
  domesticSupplierDisplay: string
  hsk10: string
  materialNameHsk: string
  latestYear: number | null
  exportLatest: number | null
  importLatest: number | null
  netLatest: number | null
  tradeStatus: TradeSummary["tradeStatus"]
  tradeRegime: string
  turnFlag: string
  tradeKey: number
  axensLummusFlag: "Y" | "N"
  priority: "A" | "B" | "C" | "D" | "E"
  priorityRank: number
}

export type SearchItem = {
  type: string
  title: string
  subtitle: string
  materialId?: string
  href: string
  haystack: string
}

export type PetroData = {
  sourceStats: Record<string, string | number>
  streamDefs: StreamDefinition[]
  materials: Material[]
  routes: Route[]
  edges: Edge[]
  routeInputs: Record<string, { materialId: string; inputRole: string; seqNo: string; remarks: string }[]>
  routeOutputs: Record<string, { materialId: string; outputRole: string; seqNo: string; remarks: string }[]>
  routeLicensors: Record<string, Licensor[]>
  outputLicensors: Record<string, string[]>
  supplierById: Record<string, { id: string; name: string; remarks: string }>
  materialSuppliers: Record<string, SupplierItem[]>
  supplierInfoByMaterial: Record<string, SupplierInfo>
  tradeSummary: TradeSummary[]
  rawTrade: RawTrade[]
  shortlist: ShortlistRow[]
  searchIndex: SearchItem[]
}
