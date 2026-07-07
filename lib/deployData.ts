import deployDbJson from "@/public/data/deploy_db.json"

export type DeployMaterialCard = {
  material_id: string | null
  material_name: string | null
  material_group: string | null
  material_type: string | null
  material_subtype: string | null
  vertical_order: number | null
  hsk10: string | number | null
  remarks: string | null
  visual_exclude: boolean | null
  ccma_snp: boolean | null
  ceh_ceh: boolean | null
  has_supplier: boolean | null
  is_ulsan: boolean | null
  sheet_name: string | null
  has_page: boolean | null
  progress: string | null
  pic: string | null
  product_overview: string | null
  production_process: string | null
  domestic_supplier: string | null
  domestic_supplier_names: string | null
  trade_status: string | null
  end_use_att?: number | null
  supply_value_overall_score?: number | null
  total_score?: number | null
  detail_sections: Record<string, { category: string | null; description: string | number | null; raw: string | number | null; short: string | number | null }>
}

export type DeployChainMaster = {
  group_id: string | null
  group_name: string | null
  stream: string | null
  related_streams: string[]
  starting_material: string | null
  starting_materials: string[]
  root_material: string | null
  root_materials: string[]
  group_score: number | null
  is_default_visible: boolean | null
  display_order: number | null
  material_count: number
  avg_total_score?: number | null
  max_total_score?: number | null
  avg_end_use_att: number | null
  max_end_use_att: number | null
}

export type DeployChainMaterialMap = {
  group_id: string | null
  group_name: string | null
  material_id: string | null
  material_name: string | null
  group_score?: number | null
  is_default_visible?: boolean | null
  material_role?: string | null
  depth?: number | null
  parent_material_id?: string | null
  display_order?: number | null
  is_key_material?: boolean | null
  end_use_att: number | null
  supply_value_overall_score?: number | null
  total_score?: number | null
  existing_value: string | number | null
  market_growth_stage: string | null
  supply_demand: string | null
  supply_shortage_flag: boolean | null
  no_new_capacity_plan_flag: boolean | null
  no_china_issue_flag: boolean | null
  import_dependency_high_flag: boolean | null
}

export type DeployRouteEdge = {
  route_id: string | null
  route_name: string | null
  route_category: string | null
  route_depth: number | string | null
  source_material_id: string | null
  target_material_id: string | null
  input_role: string | null
  output_role: string | null
  input_seq_no: number | string | null
  output_seq_no: number | string | null
  route_remarks: string | null
  input_remarks: string | null
  output_remarks: string | null
}

export type DeployAppEdge = {
  material_id: string | null
  material_name: string | null
  app_id: string | null
  end_use_id: string | null
  rating: number | null
  raw_application: string | null
  application_taxonomy: string | null
  end_use_industry: string | null
  end_use_score?: number | null
  importance: string | null
  reasoning: string | null
  taxonomy_action: string | null
  source: string | null
}

export type DeploySupplierSummary = {
  material_id: string
  supplier_count: number
  supplier_names: string[]
  locations: string[]
  total_capacity: number | null
  capacity_unit: string | null
  suppliers: {
    supplier_id: string | null
    supplier_name: string | null
    estimated_capacity: number | null
    capacity_unit: string | null
    location: string | null
    source_type: string | null
    source_year: string | number | null
    remarks: string | null
  }[]
}

export type DeployTradeSeries = {
  material_id: string
  hsk10: string[]
  rows: {
    export: number
    import: number
    net: number
    year: number
  }[]
}

export type DeployDb = {
  material_card: DeployMaterialCard[]
  chain_master: DeployChainMaster[]
  chain_material_map: DeployChainMaterialMap[]
  route_edges: DeployRouteEdge[]
  app_edges: DeployAppEdge[]
  supplier_summary: DeploySupplierSummary[]
  trade_series: DeployTradeSeries[]
}

export const deployDb = deployDbJson as DeployDb
