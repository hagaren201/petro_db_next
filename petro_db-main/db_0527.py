
from collections import defaultdict, deque
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
import os



st.set_page_config(page_title="Chemical Downstream DB", layout="wide")

BASE_DIR = os.path.dirname(__file__)
DEFAULT_FILE = os.path.join(BASE_DIR, "db.xlsx")
ROOT_OPTIONS = ["C1", "C2", "C3", "C4", "C5", "Aromatics"]
C1_MULTI_ROOT_NAMES = ["Methanol"]
C2_MULTI_ROOT_NAMES = ["Ethylene"]
C3_MULTI_ROOT_NAMES = ["Propylene"]
C4_MULTI_ROOT_NAMES = ["Butadiene", "1-Butene", "Isobutylene"]
C5_MULTI_ROOT_NAMES = ["Isoprene", "Piperylene", "DCPD"]
ARO_MULTI_ROOT_NAMES = ["Benzene", "Toluene", "Xylene"]

MULTI_ROOT_NAME_MAP = {
    "C1": C1_MULTI_ROOT_NAMES,
    "C2": C2_MULTI_ROOT_NAMES,
    "C3": C3_MULTI_ROOT_NAMES,
    "C4": C4_MULTI_ROOT_NAMES,
    "C5": C5_MULTI_ROOT_NAMES,
    "Aromatics": ARO_MULTI_ROOT_NAMES,
}

MULTI_ROOT_GROUP_MEMBERS = {
    "C1": {"Methanol", "C1"},
    "C2": {"Ethylene", "C2"},
    "C3": {"Propylene", "C3"},
    "C4": {"C4"},
    "C5": {"C5"},
    "Aromatics": {"Benzene", "Toluene", "Xylene", "Aromatics"},
}
GROUP_COLORS = {
    "C1": "#E6E0F8",
    "C2": "#D9EAF7",
    "C3": "#FCE5CD",
    "C4": "#D9EAD3",
    "C5": "#DDECCB",
    "Aromatics": "#F4CCCC",

    "Methanol": "#E6E0F8",
    "Ethylene": "#D9EAF7",
    "Propylene": "#FCE5CD",
    "Benzene": "#F4CCCC",
    "Toluene": "#F4CCCC",
    "Xylene": "#F4CCCC",

    "Other": "#EAD1DC",
}

NODE_BORDER_COLOR = "#666666"

ROOT_BOX_WIDTH = 1.32
ROOT_BOX_HEIGHT = 0.62
NODE_BOX_WIDTH = 1.18
NODE_BOX_HEIGHT = 0.56
EDGE_PAD = 0.04


def s(x) -> str:
    if pd.isna(x):
        return ""
    return str(x).strip()


def clean_df(df: pd.DataFrame) -> pd.DataFrame:
    if df is None or df.empty:
        return pd.DataFrame()
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    df = df.loc[:, ~pd.Index(df.columns).str.startswith("Unnamed")]
    for col in df.columns:
        df[col] = df[col].map(s)
    return df


@st.cache_data
def load_data(file_path: str):
    xls = pd.ExcelFile(file_path)

    required = [
        "material_master",
        "route_master",
        "route_input_link",
        "route_output_link",
    ]
    missing = [x for x in required if x not in xls.sheet_names]
    if missing:
        raise ValueError(f"Missing sheets: {missing}")

    material_df = clean_df(pd.read_excel(file_path, sheet_name="material_master"))
    route_df = clean_df(pd.read_excel(file_path, sheet_name="route_master"))
    input_df = clean_df(pd.read_excel(file_path, sheet_name="route_input_link"))
    output_df = clean_df(pd.read_excel(file_path, sheet_name="route_output_link"))

    licensor_df = clean_df(pd.read_excel(file_path, sheet_name="licensor_master")) if "licensor_master" in xls.sheet_names else pd.DataFrame()
    route_licensor_df = clean_df(pd.read_excel(file_path, sheet_name="route_licensor_link")) if "route_licensor_link" in xls.sheet_names else pd.DataFrame()
    supplier_df = clean_df(pd.read_excel(file_path, sheet_name="supplier_master")) if "supplier_master" in xls.sheet_names else pd.DataFrame()
    material_supplier_df = clean_df(pd.read_excel(file_path, sheet_name="material_supplier_link")) if "material_supplier_link" in xls.sheet_names else pd.DataFrame()

    if "visual_exclude" not in material_df.columns:
        material_df["visual_exclude"] = ""

    # harmonize optional supplier columns
    if not supplier_df.empty and "remarks" not in supplier_df.columns and "remark" in supplier_df.columns:
        supplier_df["remarks"] = supplier_df["remark"]

    return (
        material_df,
        route_df,
        input_df,
        output_df,
        licensor_df,
        route_licensor_df,
        supplier_df,
        material_supplier_df,
    )


def build_lookups(material_df: pd.DataFrame, route_df: pd.DataFrame):
    material_by_id = {
        row["material_id"]: {
            "material_name": row["material_name"],
            "material_group": row.get("material_group", ""),
            "material_type": row.get("material_type", ""),
            "remarks": row.get("remarks", ""),
            "visual_exclude": row.get("visual_exclude", ""),
            "vertical_order": row.get("vertical_order",""),
        }
        for _, row in material_df.iterrows()
        if row.get("material_id", "")
    }

    route_by_id = {
        row["route_id"]: {
            "route_name": row.get("route_name", row["route_id"]),
            "route_category": row.get("route_category", ""),
            "route_depth": row.get("route_depth", ""),
            "remarks": row.get("remarks", ""),
        }
        for _, row in route_df.iterrows()
        if row.get("route_id", "")
    }

    material_name_to_id = {
        row["material_name"]: row["material_id"]
        for _, row in material_df.iterrows()
        if row.get("material_name", "") and row.get("material_id", "")
    }

    return material_by_id, route_by_id, material_name_to_id


def build_licensor_maps(licensor_df: pd.DataFrame, route_licensor_df: pd.DataFrame):
    licensor_by_id = {}
    route_licensors = defaultdict(list)

    if not licensor_df.empty:
        licensor_name_col = "licensor_name" if "licensor_name" in licensor_df.columns else None
        for _, row in licensor_df.iterrows():
            lid = row.get("licensor_id", "")
            if not lid:
                continue
            licensor_by_id[lid] = {
                "licensor_name": row.get(licensor_name_col, lid) if licensor_name_col else lid,
                "remarks": row.get("remarks", ""),
            }

    if not route_licensor_df.empty:
        for _, row in route_licensor_df.iterrows():
            rid = row.get("route_id", "")
            lid = row.get("licensor_id", "")
            if not rid or not lid:
                continue

            lic_name = licensor_by_id.get(lid, {}).get("licensor_name", lid)
            route_licensors[rid].append(
                {
                    "licensor_id": lid,
                    "licensor_name": lic_name,
                    "remarks": row.get("remarks", ""),
                }
            )

    cleaned = {}
    for rid, items in route_licensors.items():
        seen = set()
        uniq = []
        for x in items:
            key = (x["licensor_id"], x["licensor_name"])
            if key not in seen:
                seen.add(key)
                uniq.append(x)
        cleaned[rid] = sorted(uniq, key=lambda x: x["licensor_name"])

    return licensor_by_id, cleaned


def build_supplier_maps(supplier_df: pd.DataFrame, material_supplier_df: pd.DataFrame):
    supplier_by_id = {}
    material_suppliers = defaultdict(list)

    if not supplier_df.empty:
        for _, row in supplier_df.iterrows():
            sid = row.get("supplier_id", "")
            if not sid:
                continue
            supplier_by_id[sid] = {
                "supplier_name": row.get("supplier_name", sid),
                "remarks": row.get("remarks", row.get("remark", "")),
            }

    if not material_supplier_df.empty:
        for _, row in material_supplier_df.iterrows():
            mid = row.get("material_id", "")
            sid = row.get("supplier_id", "")
            if not mid or not sid:
                continue

            supplier_name = supplier_by_id.get(sid, {}).get("supplier_name", sid)
            material_suppliers[mid].append(
                {
                    "supplier_id": sid,
                    "supplier_name": supplier_name,
                    "estimated_capacity": row.get("estimated_capacity", ""),
                    "capacity_unit": row.get("capacity_unit", ""),
                    "location": row.get("location", ""),
                    "source_type": row.get("source_type", ""),
                    "source_year": row.get("source_year", ""),
                    "remarks": row.get("remarks", row.get("remark", "")),
                }
            )

    cleaned = {}
    for mid, items in material_suppliers.items():
        seen = set()
        uniq = []
        for x in items:
            key = (
                x["supplier_id"],
                x["location"],
                x["estimated_capacity"],
                x["capacity_unit"],
                x["remarks"],
            )
            if key not in seen:
                seen.add(key)
                uniq.append(x)
        cleaned[mid] = sorted(uniq, key=lambda x: (x["supplier_name"], x["location"], x["estimated_capacity"]))

    return supplier_by_id, cleaned


def get_all_licensor_names(route_licensors: dict):
    return sorted(
        {
            item["licensor_name"]
            for items in route_licensors.values()
            for item in items
            if item["licensor_name"]
        }
    )


def get_all_supplier_names(material_suppliers: dict):
    return sorted(
        {
            item["supplier_name"]
            for items in material_suppliers.values()
            for item in items
            if item["supplier_name"]
        }
    )


def get_all_locations(material_suppliers: dict):
    return sorted(
        {
            item["location"]
            for items in material_suppliers.values()
            for item in items
            if item["location"]
        }
    )

def resolve_location_filter(location_scope: str, manual_locations=None):
    manual_locations = manual_locations or []

    if location_scope == "전국":
        return []
    if location_scope == "울산":
        return ["울산"]
    if location_scope == "직접선택":
        return manual_locations
    return []


def build_route_maps(input_df: pd.DataFrame, output_df: pd.DataFrame):
    route_inputs = defaultdict(list)
    route_outputs = defaultdict(list)

    for _, row in input_df.iterrows():
        rid = row.get("route_id", "")
        mid = row.get("material_id", "")
        if rid and mid:
            route_inputs[rid].append(
                {
                    "material_id": mid,
                    "input_role": row.get("input_role", ""),
                    "seq_no": row.get("seq_no", ""),
                    "remarks": row.get("remarks", ""),
                }
            )

    for _, row in output_df.iterrows():
        rid = row.get("route_id", "")
        mid = row.get("material_id", "")
        if rid and mid:
            route_outputs[rid].append(
                {
                    "material_id": mid,
                    "output_role": row.get("output_role", ""),
                    "seq_no": row.get("seq_no", ""),
                    "remarks": row.get("remarks", ""),
                }
            )

    return route_inputs, route_outputs


def is_hidden_material(material_by_id: dict, material_id: str) -> bool:
    return material_by_id.get(material_id, {}).get("visual_exclude", "").upper() == "Y"


def build_material_edges(route_inputs, route_outputs):
    edges = []
    for rid in sorted(set(route_inputs.keys()) | set(route_outputs.keys())):
        ins = route_inputs.get(rid, [])
        outs = route_outputs.get(rid, [])
        for i in ins:
            for o in outs:
                edges.append(
                    {
                        "src": i["material_id"],
                        "dst": o["material_id"],
                        "route_id": rid,
                        "input_role": i.get("input_role", ""),
                        "output_role": o.get("output_role", ""),
                    }
                )       
    return edges


def filter_edges_structural(
    edges: list,
    material_by_id: dict,
    show_hidden_materials: bool,
    include_cross_group: bool,
    start_group: str,
):
    filtered = []
    allowed_groups = MULTI_ROOT_GROUP_MEMBERS.get(start_group, {start_group})

    for e in edges:
        src = e["src"]
        dst = e["dst"]

        if not show_hidden_materials:
            if is_hidden_material(material_by_id, src) or is_hidden_material(material_by_id, dst):
                continue

        if not include_cross_group:
            src_group = material_by_id.get(src, {}).get("material_group", "")
            dst_group = material_by_id.get(dst, {}).get("material_group", "")
            if src_group not in allowed_groups or dst_group not in allowed_groups:
                continue

        filtered.append(e)

    return filtered


def route_matches_filters(route_id: str, route_licensors: dict, licensable_only=False, selected_licensors=None):
    selected_licensors = selected_licensors or []
    licensors = route_licensors.get(route_id, [])
    licensor_names = {x["licensor_name"] for x in licensors}
    is_licensable = len(licensors) > 0

    if licensable_only and not is_licensable:
        return False

    if selected_licensors and not (set(selected_licensors) & licensor_names):
        return False

    return True


def material_matches_supplier_filters(
    material_id: str,
    material_suppliers: dict,
    supplier_required=False,
    selected_suppliers=None,
    selected_locations=None,
):
    selected_suppliers = selected_suppliers or []
    selected_locations = selected_locations or []

    items = material_suppliers.get(material_id, [])

    if supplier_required and not items:
        return False

    if selected_suppliers:
        names = {x["supplier_name"] for x in items}
        if not (set(selected_suppliers) & names):
            return False

    if selected_locations:
        locations = {x["location"] for x in items}
        if not (set(selected_locations) & locations):
            return False

    return True


def get_root_candidates(material_df: pd.DataFrame):
    root_candidates = []

    for g in ROOT_OPTIONS:
        if g in MULTI_ROOT_NAME_MAP:
            root_names = MULTI_ROOT_NAME_MAP[g]
            subset = material_df[material_df["material_name"].isin(root_names)]

            if len(subset) > 0:
                root_candidates.append(
                    {
                        "label": g,
                        "group": g,
                        "material_id": "",
                        "material_name": g,
                        "is_multi_root": True,
                    }
                )
            continue

    return root_candidates


def get_start_root_ids(selected_root: dict, material_name_to_id: dict):
    if not selected_root.get("is_multi_root", False):
        return [selected_root["material_id"]]

    group = selected_root.get("group", "")
    root_names = MULTI_ROOT_NAME_MAP.get(group, [])
    root_ids = []
    for name in root_names:
        mid = material_name_to_id.get(name)
        if mid:
            root_ids.append(mid)
    return root_ids


def build_adjacency(edges: list):
    adj = defaultdict(list)
    for e in edges:
        adj[e["src"]].append(e)
    for k in adj:
        adj[k] = sorted(adj[k], key=lambda x: (x["dst"], x["route_id"]))
    return adj


def get_first_level_children_multi(adj, root_ids: list):
    children = []
    for root_id in root_ids:
        children.extend([e["dst"] for e in adj.get(root_id, [])])
    return sorted(set(children))


def collect_lane_edges(adj, lane_root_id: str, max_depth: int):
    visited_nodes = {lane_root_id}
    visited_edges = []
    depth_map = {lane_root_id: 1}
    q = deque([(lane_root_id, 1)])

    while q:
        node, depth = q.popleft()
        if depth >= max_depth:
            continue

        for e in adj.get(node, []):
            dst = e["dst"]
            next_depth = depth + 1
            visited_edges.append(
                {
                    "src": node,
                    "dst": dst,
                    "route_id": e["route_id"],
                    "depth": next_depth,
                    "input_role": e.get("input_role", ""),
                    "output_role": e.get("output_role", ""),
                }
            )
            if dst not in visited_nodes:
                visited_nodes.add(dst)
                depth_map[dst] = next_depth
                q.append((dst, next_depth))

    return visited_nodes, visited_edges, depth_map


def collect_start_edges(adj, root_ids: list, lane_roots: list):
    lane_root_set = set(lane_roots)
    start_edges = []
    seen = set()

    for root_id in root_ids:
        for e in adj.get(root_id, []):
            if e["dst"] not in lane_root_set:
                continue
            key = (e["src"], e["dst"], e["route_id"])
            if key in seen:
                continue
            seen.add(key)
            start_edges.append(
                {
                    "src": e["src"],
                    "dst": e["dst"],
                    "route_id": e["route_id"],
                    "depth": 1,
                    "input_role": e.get("input_role", ""),
                    "output_role": e.get("output_role", ""),
                }
            )

    return start_edges


def build_lane_layout(root_ids: list, lane_roots: list, lane_results: dict, start_edges: list, material_by_id: dict):
    X_GAP = 2.0
    NODE_Y_GAP = 0.8
    LANE_GAP = 1.0
    ROOT_SECTION_GAP = 1.4

    positions = {}

    root_to_lane_roots = defaultdict(list)
    lane_root_to_src = {}
    for e in start_edges:
        src = e["src"]
        dst = e["dst"]
        if src in root_ids and dst in lane_roots and dst not in lane_root_to_src:
            lane_root_to_src[dst] = src
            root_to_lane_roots[src].append(dst)

    unassigned_lane_roots = [lr for lr in lane_roots if lr not in lane_root_to_src]
    if root_ids:
        for i, lr in enumerate(unassigned_lane_roots):
            root_to_lane_roots[root_ids[i % len(root_ids)]].append(lr)

    lane_height_map = {}
    for lane_root in lane_roots:
        _, _, depth_map = lane_results[lane_root]
        nodes_by_depth = defaultdict(list)
        for node, depth in depth_map.items():
            nodes_by_depth[depth].append(node)
        max_nodes_in_any_depth = max((len(v) for v in nodes_by_depth.values()), default=1)
        lane_height_map[lane_root] = max(1.0, (max_nodes_in_any_depth - 1) * NODE_Y_GAP)

    section_height_map = {}
    for rid in root_ids:
        grouped_lane_roots = sorted(set(root_to_lane_roots.get(rid, [])), key=lambda x: x)
        if grouped_lane_roots:
            section_height = sum(lane_height_map[lr] for lr in grouped_lane_roots)
            section_height += max(0, len(grouped_lane_roots) - 1) * LANE_GAP
        else:
            section_height = 1.0
        section_height_map[rid] = section_height

    total_height = sum(section_height_map[rid] for rid in root_ids)
    total_height += max(0, len(root_ids) - 1) * ROOT_SECTION_GAP
    current_top = total_height / 2

    for rid in root_ids:
        section_height = section_height_map[rid]
        section_center = current_top - section_height / 2
        positions[rid] = (0.0, section_center)

        section_lane_roots = sorted(set(root_to_lane_roots.get(rid, [])),key=lambda mid: material_sort_key(mid, material_by_id),)

        lane_current_top = current_top
        for lane_root in section_lane_roots:
            lane_height = lane_height_map[lane_root]
            lane_center = lane_current_top - lane_height / 2
            lane_current_top -= lane_height + LANE_GAP

            _, _, depth_map = lane_results[lane_root]
            nodes_by_depth = defaultdict(list)
            for node, depth in depth_map.items():
                nodes_by_depth[depth].append(node)

            positions[lane_root] = (1 * X_GAP, lane_center)

            for depth in sorted(nodes_by_depth.keys()):
                if depth == 1:
                    continue

                nodes = sorted(
                    set(nodes_by_depth[depth]),
                    key=lambda mid: material_sort_key(mid, material_by_id),
                )
                n = len(nodes)
                center = (n - 1) / 2

                for j, node in enumerate(nodes):
                    y = lane_center + (center - j) * NODE_Y_GAP
                    positions[node] = (depth * X_GAP, y)

        current_top -= section_height + ROOT_SECTION_GAP

    return positions


def material_sort_key(mid, material_by_id):
    meta = material_by_id.get(mid, {})
    raw_order = str(meta.get("vertical_order", "")).strip()

    try:
        order = int(raw_order) if raw_order else 9999
    except ValueError:
        order = 9999

    name = meta.get("material_name", str(mid))
    return (order, name)


def get_box_width(node_id: str, root_ids: list) -> float:
    return ROOT_BOX_WIDTH if node_id in root_ids else NODE_BOX_WIDTH


def summarize_suppliers(items):
    if not items:
        return "", "", ""
    names = ", ".join(sorted({x["supplier_name"] for x in items if x["supplier_name"]}))
    locations = ", ".join(sorted({x["location"] for x in items if x["location"]}))
    cap_parts = []
    for x in items:
        cap = x.get("estimated_capacity", "")
        unit = x.get("capacity_unit", "")
        if cap:
            cap_parts.append(f"{cap} {unit}".strip())
    cap_text = ", ".join(cap_parts[:5])
    if len(cap_parts) > 5:
        cap_text += " ..."
    return names, locations, cap_text


def summarize_suppliers_short(items, max_names=3, max_locations=2):
    if not items:
        return "", ""

    supplier_names = sorted({x["supplier_name"] for x in items if x.get("supplier_name")})
    locations = sorted({x["location"] for x in items if x.get("location")})

    supplier_text = ", ".join(supplier_names[:max_names])
    if len(supplier_names) > max_names:
        supplier_text += f" +{len(supplier_names) - max_names}"

    location_text = ", ".join(locations[:max_locations])
    if len(locations) > max_locations:
        location_text += f" +{len(locations) - max_locations}"

    return supplier_text, location_text


def format_capacity_sum(items):
    total = 0.0
    has_value = False
    units = []
    for x in items:
        raw = str(x.get("estimated_capacity", "")).replace(",", "").strip()
        if not raw:
            continue
        try:
            total += float(raw)
            has_value = True
        except ValueError:
            continue
        unit = x.get("capacity_unit", "").strip()
        if unit and unit not in units:
            units.append(unit)

    if not has_value:
        return ""

    total_text = f"{int(total):,}" if abs(total - round(total)) < 1e-9 else f"{total:,.1f}"
    unit_text = "/".join(units) if units else ""
    return f"{total_text} {unit_text}".strip()



def build_node_hover_text(node_id, meta, info, route_filter_active=False, supplier_filter_active=False):
    def clean_text(text, fallback="-"):
        text = str(text or "").strip()
        return text if text else fallback

    lines = [f"<b>{meta['material_name']}</b>"]
    lines.append(f"Remark: {clean_text(meta.get('remarks', ''))}")

    licensor_names = info.get("route_licensor_names", [])
    licensor_text = ", ".join(licensor_names) if licensor_names else "-"
    lines.append(f"Matched route Licensors: {licensor_text}")

    supplier_names = info.get("display_supplier_names", [])
    supplier_label = "Suppliers (filtered)" if supplier_filter_active else "Suppliers"
    supplier_text = ", ".join(supplier_names) if supplier_names else "-"
    lines.append(f"{supplier_label}: {supplier_text}")

    capacity_label = "Total capacity (filtered)" if supplier_filter_active else "Total capacity"
    capacity_text = clean_text(info.get("display_capacity_total", ""))
    lines.append(f"{capacity_label}: {capacity_text}")

    return "<br>".join(lines)


def render_highlight_legend(route_filter_active=False, supplier_filter_active=False):
    items = []

    if route_filter_active and supplier_filter_active:
        items = [
            ("#2F2F2F", "Both matched"),
            ("#3F84FB", "Route / licensor matched"),
            ("#2E7D32", "Material / supplier matched"),
            ("#B9B9B9", "Not matched (dimmed)"),
        ]
    elif route_filter_active:
        items = [
            ("#3F84FB", "Route / licensor matched"),
            ("#B9B9B9", "Not matched (dimmed)"),
        ]
    elif supplier_filter_active:
        items = [
            ("#2E7D32", "Material / supplier matched"),
            ("#B9B9B9", "Not matched (dimmed)"),
        ]
    else:
        items = [
            ("#999999", "Default network view"),
        ]

    chips = "".join(
        [
            f"<div style='display:inline-flex;align-items:center;margin-right:18px;margin-bottom:6px;'>"
            f"<span style='display:inline-block;width:12px;height:12px;background:{color};border-radius:2px;margin-right:7px;border:1px solid #777;'></span>"
            f"<span style='font-size:13px;color:#444;'>{label}</span></div>"
            for color, label in items
        ]
    )

    st.markdown(
        "<div style='padding:8px 0 2px 0;'><div style='font-size:13px;font-weight:600;color:#5E6C84;margin-bottom:6px;'>Highlight legend</div>"
        + chips
        + "</div>",
        unsafe_allow_html=True,
    )


def annotate_graph(
    root_ids,
    start_edges,
    lane_roots,
    lane_results,
    route_licensors,
    material_suppliers,
    licensable_only=False,
    selected_licensors=None,
    supplier_required=False,
    selected_suppliers=None,
    selected_locations=None,
):
    selected_licensors = selected_licensors or []
    selected_suppliers = selected_suppliers or []
    selected_locations = selected_locations or []

    supplier_filter_active = supplier_required or bool(selected_suppliers) or bool(selected_locations)
    route_filter_active = licensable_only or bool(selected_licensors)

    visible_nodes = set(root_ids)
    visible_edges = []

    for e in start_edges:
        visible_edges.append(dict(e))
        visible_nodes.add(e["src"])
        visible_nodes.add(e["dst"])

    for lane_root in lane_roots:
        lane_nodes, lane_edges, _ = lane_results[lane_root]
        visible_nodes |= lane_nodes
        visible_edges.extend(dict(x) for x in lane_edges)

    dedup = {}
    for e in visible_edges:
        key = (e["src"], e["dst"], e["route_id"])
        if key not in dedup:
            dedup[key] = e
    visible_edges = list(dedup.values())

    node_info = {}
    for node_id in visible_nodes:
        items = material_suppliers.get(node_id, [])
        node_supplier_match = material_matches_supplier_filters(
            node_id,
            material_suppliers,
            supplier_required=supplier_required,
            selected_suppliers=selected_suppliers,
            selected_locations=selected_locations,
        )
        node_info[node_id] = {
            "supplier_items": items,
            "supplier_count": len(items),
            "supplier_match": node_supplier_match,
            "route_match": False,
            "matched_route_ids": set(),
            "route_licensor_names": [],
            "display_supplier_items": [],
            "display_supplier_names": [],
            "display_capacity_total": "",
        }

    annotated_edges = []
    for e in visible_edges:
        src = e["src"]
        dst = e["dst"]
        rid = e["route_id"]

        route_match = route_matches_filters(
            rid,
            route_licensors,
            licensable_only=licensable_only,
            selected_licensors=selected_licensors,
        )

        src_match = node_info.get(src, {}).get("supplier_match", False)
        dst_match = node_info.get(dst, {}).get("supplier_match", False)
        supplier_edge_match = src_match or dst_match

        e2 = dict(e)
        e2["route_match"] = route_match
        e2["src_supplier_match"] = src_match
        e2["dst_supplier_match"] = dst_match
        e2["supplier_match"] = supplier_edge_match
        e2["both_match"] = route_match and supplier_edge_match
        annotated_edges.append(e2)

        if route_match:
            licensors = route_licensors.get(rid, [])
            licensor_names = sorted({x["licensor_name"] for x in licensors if x.get("licensor_name")})
            if src in node_info:
                node_info[src]["route_match"] = True
                node_info[src]["matched_route_ids"].add(rid)
                node_info[src]["route_licensor_names"] = sorted(set(node_info[src]["route_licensor_names"]) | set(licensor_names))
            if dst in node_info:
                node_info[dst]["route_match"] = True
                node_info[dst]["matched_route_ids"].add(rid)
                node_info[dst]["route_licensor_names"] = sorted(set(node_info[dst]["route_licensor_names"]) | set(licensor_names))

    for node_id, info in node_info.items():
        items = info.get("supplier_items", [])
        filtered_items = []
        for x in items:
            keep = True
            if selected_suppliers:
                keep = keep and x.get("supplier_name", "") in selected_suppliers
            if selected_locations:
                keep = keep and x.get("location", "") in selected_locations
            if keep:
                filtered_items.append(x)

        if supplier_filter_active:
            display_items = filtered_items
        else:
            display_items = items

        info["display_supplier_items"] = display_items
        info["display_supplier_names"] = sorted({x["supplier_name"] for x in display_items if x.get("supplier_name")})
        info["display_capacity_total"] = format_capacity_sum(display_items)
        info["route_licensor_names"] = sorted(info.get("route_licensor_names", []))

        supplier_text, location_text = summarize_suppliers_short(display_items)
        info["supplier_names_text"] = supplier_text
        info["locations_text"] = location_text
        info["capacity_text"] = info["display_capacity_total"]

    return annotated_edges, node_info, route_filter_active, supplier_filter_active


def apply_display_modes(
    root_ids,
    annotated_edges,
    node_info,
    route_filter_mode="Highlight",
    material_filter_mode="Highlight",
    route_filter_active=False,
    supplier_filter_active=False,
):
    kept_edges = []
    for e in annotated_edges:
        keep = True
        if route_filter_active and route_filter_mode == "Hide":
            keep = keep and e["route_match"]
        if supplier_filter_active and material_filter_mode == "Hide":
            keep = keep and e["supplier_match"]
        if keep:
            kept_edges.append(e)

    kept_nodes = set(root_ids)
    for e in kept_edges:
        kept_nodes.add(e["src"])
        kept_nodes.add(e["dst"])

    if not kept_edges and (route_filter_mode == "Hide" or material_filter_mode == "Hide"):
        kept_nodes = set(root_ids)

    return kept_edges, kept_nodes


def add_rect_shape(fig, x, y, style, width=1.15, height=0.58):
    x0 = x - width / 2
    x1 = x + width / 2
    y0 = y - height / 2
    y1 = y + height / 2

    fig.add_shape(
        type="rect",
        x0=x0,
        x1=x1,
        y0=y0,
        y1=y1,
        line=dict(color=style["linecolor"], width=style["linewidth"]),
        fillcolor=style["fillcolor"],
        opacity=style["opacity"],
        layer="below",
    )


def get_node_style(
    node_id,
    root_ids,
    material_by_id,
    node_info,
    route_filter_active=False,
    supplier_filter_active=False,
):
    base_fill = GROUP_COLORS.get(material_by_id[node_id]["material_group"], "#EFEFEF")
    info = node_info.get(node_id, {})

    route_hit = info.get("route_match", False)
    supplier_hit = info.get("supplier_match", False)

    if route_filter_active and supplier_filter_active:
        if route_hit and supplier_hit:
            return {"fillcolor": base_fill, "linecolor": "#2F2F2F", "linewidth": 2.6, "opacity": 1.0}
        if route_hit:
            return {"fillcolor": base_fill, "linecolor": "#3F84FB", "linewidth": 2.3, "opacity": 1.0}
        if supplier_hit:
            return {"fillcolor": base_fill, "linecolor": "#2E7D32", "linewidth": 2.3, "opacity": 1.0}
        return {"fillcolor": base_fill, "linecolor": "#B5B5B5", "linewidth": 1.2, "opacity": 0.40}

    if route_filter_active:
        if route_hit:
            return {"fillcolor": base_fill, "linecolor": "#3F84FB", "linewidth": 2.3, "opacity": 1.0}
        return {"fillcolor": base_fill, "linecolor": "#B5B5B5", "linewidth": 1.2, "opacity": 0.40}

    if supplier_filter_active:
        if supplier_hit:
            return {"fillcolor": base_fill, "linecolor": "#2E7D32", "linewidth": 2.3, "opacity": 1.0}
        return {"fillcolor": base_fill, "linecolor": "#B5B5B5", "linewidth": 1.2, "opacity": 0.40}

    return {"fillcolor": base_fill, "linecolor": NODE_BORDER_COLOR, "linewidth": 1.6, "opacity": 1.0}


def get_edge_bucket(e, route_filter_active=False, supplier_filter_active=False):
    if route_filter_active and supplier_filter_active:
        if e["both_match"]:
            return "both"
        if e["route_match"]:
            return "route"
        if e["supplier_match"]:
            return "supplier"
        return "other"

    if route_filter_active:
        return "route" if e["route_match"] else "other"

    if supplier_filter_active:
        return "supplier" if e["supplier_match"] else "other"

    return "default"


EDGE_STYLES = {
    "both": dict(color="rgba(55,55,55,0.95)", width=2.6),
    "route": dict(color="rgba(63,132,251,0.95)", width=2.2),
    "supplier": dict(color="rgba(46,125,50,0.95)", width=2.2),
    "other": dict(color="rgba(185,185,185,0.32)", width=1.0),
    "default": dict(color="rgba(150,150,150,0.72)", width=1.4),
}


def draw_lane_chart(
    root_ids,
    kept_nodes,
    kept_edges,
    positions,
    material_by_id,
    node_info,
    route_filter_active=False,
    supplier_filter_active=False,
):
    fig = go.Figure()

    bucket_xy = defaultdict(lambda: {"x": [], "y": []})
    for e in kept_edges:
        src = e["src"]
        dst = e["dst"]
        if src not in positions or dst not in positions:
            continue

        x0, y0 = positions[src]
        x1, y1 = positions[dst]

        src_width = get_box_width(src, root_ids)
        dst_width = get_box_width(dst, root_ids)

        x0_edge = x0 + src_width / 2 + EDGE_PAD
        x1_edge = x1 - dst_width / 2 - EDGE_PAD
        mid_x = (x0_edge + x1_edge) / 2

        bucket = get_edge_bucket(
            e,
            route_filter_active=route_filter_active,
            supplier_filter_active=supplier_filter_active,
        )
        bucket_xy[bucket]["x"] += [x0_edge, mid_x, mid_x, x1_edge, None]
        bucket_xy[bucket]["y"] += [y0, y0, y1, y1, None]

    draw_order = ["other", "default", "supplier", "route", "both"]
    for bucket in draw_order:
        if bucket not in bucket_xy or not bucket_xy[bucket]["x"]:
            continue
        fig.add_trace(
            go.Scatter(
                x=bucket_xy[bucket]["x"],
                y=bucket_xy[bucket]["y"],
                mode="lines",
                line=EDGE_STYLES[bucket],
                hoverinfo="skip",
                showlegend=False,
            )
        )

    for node_id, (x, y) in positions.items():
        if node_id not in kept_nodes:
            continue
        style = get_node_style(
            node_id,
            root_ids,
            material_by_id,
            node_info,
            route_filter_active=route_filter_active,
            supplier_filter_active=supplier_filter_active,
        )
        if node_id in root_ids:
            add_rect_shape(fig, x, y, style, width=ROOT_BOX_WIDTH, height=ROOT_BOX_HEIGHT)
        else:
            add_rect_shape(fig, x, y, style, width=NODE_BOX_WIDTH, height=NODE_BOX_HEIGHT)

    node_x = []
    node_y = []
    node_text = []
    node_hover = []

    for node_id, (x, y) in positions.items():
        if node_id not in kept_nodes:
            continue

        meta = material_by_id[node_id]
        info = node_info.get(node_id, {})

        node_x.append(x)
        node_y.append(y)
        node_text.append(meta["material_name"])
        node_hover.append(
            build_node_hover_text(
                node_id,
                meta,
                info,
                route_filter_active=route_filter_active,
                supplier_filter_active=supplier_filter_active,
            )
        )

    fig.add_trace(
        go.Scatter(
            x=node_x,
            y=node_y,
            mode="text",
            text=node_text,
            textposition="middle center",
            hoverinfo="text",
            hovertext=node_hover,
            textfont=dict(size=15, color="#222222", family="Arial"),
            cliponaxis=False,
            showlegend=False,
        )
    )

    unique_x = sorted(set(x for node_id, (x, _) in positions.items() if node_id in kept_nodes))
    if not unique_x:
        unique_x = [0, 2]

    all_y = [y for node_id, (_, y) in positions.items() if node_id in kept_nodes]
    if not all_y:
        all_y = [0]

    top_y = max(all_y) + 1.2
    for i, x in enumerate(unique_x):
        title = "Start" if i == 0 else f"Depth {i}"
        fig.add_annotation(
            x=x,
            y=top_y,
            text=f"<b>{title}</b>",
            showarrow=False,
            font=dict(size=13, color="#5E6C84"),
        )

    y_min = min(all_y) - 1.5
    y_max = max(all_y) + 1.8

    fig.update_layout(
        height=max(950, int((y_max - y_min) * 75)),
        margin=dict(l=20, r=20, t=60, b=20),
        plot_bgcolor="white",
        paper_bgcolor="white",
        xaxis=dict(showgrid=False, zeroline=False, visible=False),
        yaxis=dict(showgrid=False, zeroline=False, visible=False, range=[y_min, y_max]),
    )
    return fig


def build_visible_route_table(
    kept_edges,
    material_by_id,
    route_by_id,
    route_licensors,
    node_info,
):
    rows = []
    for e in kept_edges:
        rid = e["route_id"]
        licensors = route_licensors.get(rid, [])
        licensor_names = ", ".join(x["licensor_name"] for x in licensors)

        rows.append(
            {
                "depth": e.get("depth", ""),
                "from_material": material_by_id[e["src"]]["material_name"],
                "to_material": material_by_id[e["dst"]]["material_name"],
                "route_id": rid,
                "route_name": route_by_id.get(rid, {}).get("route_name", rid),
                "licensable": "Y" if licensors else "N",
                "licensors": licensor_names,
                "route_match": "Y" if e.get("route_match") else "N",
                "src_supplier_match": "Y" if e.get("src_supplier_match") else "N",
                "dst_supplier_match": "Y" if e.get("dst_supplier_match") else "N",
            }
        )

    if not rows:
        return pd.DataFrame(columns=[
            "depth", "from_material", "to_material", "route_id", "route_name",
            "licensable", "licensors", "route_match", "src_supplier_match", "dst_supplier_match"
        ])
    return pd.DataFrame(rows)


def build_supplier_summary_table(kept_nodes, material_by_id, node_info):
    rows = []
    for node_id in sorted(kept_nodes):
        if node_id not in material_by_id:
            continue
        info = node_info.get(node_id, {})
        if info.get("supplier_count", 0) == 0:
            continue
        rows.append(
            {
                "material_id": node_id,
                "material_name": material_by_id[node_id]["material_name"],
                "group": material_by_id[node_id]["material_group"],
                "supplier_count": info.get("supplier_count", 0),
                "supplier_match": "Y" if info.get("supplier_match") else "N",
                "suppliers": info.get("supplier_names_text", ""),
                "locations": info.get("locations_text", ""),
                "capacity": info.get("capacity_text", ""),
            }
        )
    if not rows:
        return pd.DataFrame(columns=[
            "material_id", "material_name", "group", "supplier_count", "supplier_match", "suppliers", "locations", "capacity"
        ])
    return pd.DataFrame(rows)


# -------------------------
# UI
# -------------------------
st.title("Chemical Downstream DB")
st.caption("Chemical Downstream 유도체별 Licensor/Supplier 정보")

uploaded = st.sidebar.file_uploader("Upload Excel DB", type=["xlsx"])
file_source = uploaded if uploaded is not None else DEFAULT_FILE

if uploaded is None and not Path(DEFAULT_FILE).exists():
    st.warning(f"현재 폴더에 {DEFAULT_FILE} 가 없습니다. 엑셀을 업로드해 주세요.")
    st.stop()

try:
    (
        material_df,
        route_df,
        input_df,
        output_df,
        licensor_df,
        route_licensor_df,
        supplier_df,
        material_supplier_df,
    ) = load_data(file_source)
except Exception as e:
    st.error(f"파일 읽기 오류: {e}")
    st.stop()

material_by_id, route_by_id, material_name_to_id = build_lookups(material_df, route_df)
licensor_by_id, route_licensors = build_licensor_maps(licensor_df, route_licensor_df)
supplier_by_id, material_suppliers = build_supplier_maps(supplier_df, material_supplier_df)

route_inputs, route_outputs = build_route_maps(input_df, output_df)
all_edges = build_material_edges(route_inputs, route_outputs)

root_candidates = get_root_candidates(material_df)
if not root_candidates:
    st.error("시작 material을 찾을 수 없습니다.")
    st.stop()

selected_root_label = st.sidebar.selectbox("Start chain", [x["label"] for x in root_candidates])
selected_root = next(x for x in root_candidates if x["label"] == selected_root_label)
selected_root_group = selected_root["group"]
selected_root_ids = get_start_root_ids(selected_root, material_name_to_id)

if selected_root_group in MULTI_ROOT_NAME_MAP:
    missing_multi = [name for name in MULTI_ROOT_NAME_MAP[selected_root_group] if name not in material_name_to_id]
    if missing_multi:
        st.error(f"{selected_root_group} multi-root material 누락: {missing_multi}")
        st.stop()

max_depth = st.sidebar.slider("Show depth", min_value=1, max_value=5, value=4)
show_hidden_materials = st.sidebar.checkbox("Show hidden materials", value=False)
include_cross_group = st.sidebar.checkbox("Include cross-group materials", value=True)

st.sidebar.markdown("---")
st.sidebar.subheader("Route / Licensor")

route_filter_mode = st.sidebar.radio("Route filter mode", ["Highlight", "Hide"], index=0)
has_licensor_data = len(route_licensors) > 0
all_licensor_names = get_all_licensor_names(route_licensors) if has_licensor_data else []

if has_licensor_data:
    licensable_only = st.sidebar.checkbox("Licensable routes only", value=False)
    selected_licensors = st.sidebar.multiselect("Specific licensors", options=all_licensor_names, default=[])
else:
    licensable_only = False
    selected_licensors = []
    st.sidebar.caption("No licensor data found")

st.sidebar.markdown("---")
st.sidebar.subheader("Material / Supplier")

material_filter_mode = st.sidebar.radio("Material filter mode", ["Highlight", "Hide"], index=0)
has_supplier_data = len(material_suppliers) > 0
all_supplier_names = get_all_supplier_names(material_suppliers) if has_supplier_data else []
all_locations = get_all_locations(material_suppliers) if has_supplier_data else []

if has_supplier_data:
    supplier_required = st.sidebar.checkbox("Known supplier data only", value=False)
    selected_suppliers = st.sidebar.multiselect("Specific suppliers", options=all_supplier_names, default=[])

    location_scope = st.sidebar.radio(
        "Supplier region",
        ["전국", "울산", "직접선택"],
        index=0,
        horizontal=True,
    )

    manual_locations = []
    if location_scope == "직접선택":
        manual_locations = st.sidebar.multiselect(
            "Specific locations",
            options=all_locations,
            default=[],
        )

    selected_locations = resolve_location_filter(location_scope, manual_locations)
else:
    supplier_required = False
    selected_suppliers = []
    selected_locations = []
    st.sidebar.caption("No supplier data found")

edges = filter_edges_structural(
    edges=all_edges,
    material_by_id=material_by_id,
    show_hidden_materials=show_hidden_materials,
    include_cross_group=include_cross_group,
    start_group=selected_root_group,
)

adj = build_adjacency(edges)
lane_roots = get_first_level_children_multi(adj, selected_root_ids)
lane_roots = sorted(set(lane_roots), key=lambda mid: material_by_id[mid]["material_name"])

lane_results = {}
for lane_root in lane_roots:
    lane_results[lane_root] = collect_lane_edges(adj, lane_root, max_depth=max_depth)

start_edges = collect_start_edges(adj, selected_root_ids, lane_roots)
positions = build_lane_layout(selected_root_ids,lane_roots,lane_results,start_edges,material_by_id,)

annotated_edges, node_info, route_filter_active, supplier_filter_active = annotate_graph(
    root_ids=selected_root_ids,
    start_edges=start_edges,
    lane_roots=lane_roots,
    lane_results=lane_results,
    route_licensors=route_licensors,
    material_suppliers=material_suppliers,
    licensable_only=licensable_only,
    selected_licensors=selected_licensors,
    supplier_required=supplier_required,
    selected_suppliers=selected_suppliers,
    selected_locations=selected_locations,
)

kept_edges, kept_nodes = apply_display_modes(
    root_ids=selected_root_ids,
    annotated_edges=annotated_edges,
    node_info=node_info,
    route_filter_mode=route_filter_mode,
    material_filter_mode=material_filter_mode,
    route_filter_active=route_filter_active,
    supplier_filter_active=supplier_filter_active,
)

visible_route_ids = {e["route_id"] for e in kept_edges}
route_matched_routes = len({e["route_id"] for e in annotated_edges if e.get("route_match")})
supplier_matched_nodes = sum(1 for nid in kept_nodes if node_info.get(nid, {}).get("supplier_match"))

c1, c2, c3, c4 = st.columns(4)
c1.metric("Visible materials", len(kept_nodes))
c2.metric("Visible links", len(kept_edges))
c3.metric("Route-matched routes", route_matched_routes)
c4.metric("Supplier-matched materials", supplier_matched_nodes)

render_highlight_legend(
    route_filter_active=route_filter_active,
    supplier_filter_active=supplier_filter_active,
)

if (route_filter_mode == "Hide" or material_filter_mode == "Hide") and len(kept_edges) == 0:
    st.info("Hide 모드 조건으로 남은 링크가 없습니다. Highlight 모드로 보면 전체 구조 위에 매칭 상태를 더 쉽게 볼 수 있습니다.")

fig = draw_lane_chart(
    root_ids=selected_root_ids,
    kept_nodes=kept_nodes,
    kept_edges=kept_edges,
    positions=positions,
    material_by_id=material_by_id,
    node_info=node_info,
    route_filter_active=route_filter_active,
    supplier_filter_active=supplier_filter_active,
)
st.plotly_chart(fig, width='stretch')
st.caption("마우스를 가져다 대시면 Licensor, Supplier list, Capacity를 보여줍니다. 상세 정보는 아래를 참고하세요.")

st.subheader("Visible links")
visible_df = build_visible_route_table(
    kept_edges=kept_edges,
    material_by_id=material_by_id,
    route_by_id=route_by_id,
    route_licensors=route_licensors,
    node_info=node_info,
)
st.dataframe(visible_df, width='stretch')

st.subheader("Supplier summary")
supplier_summary_df = build_supplier_summary_table(
    kept_nodes=kept_nodes,
    material_by_id=material_by_id,
    node_info=node_info,
)
st.dataframe(supplier_summary_df, width='stretch')

with st.expander("Raw tables"):
    st.write("material_master")
    st.dataframe(material_df, width='stretch')

    st.write("route_master")
    st.dataframe(route_df, width='stretch')

    st.write("route_input_link")
    st.dataframe(input_df, width='stretch')

    st.write("route_output_link")
    st.dataframe(output_df, width='stretch')

    if not licensor_df.empty:
        st.write("licensor_master")
        st.dataframe(licensor_df, width='stretch')

    if not route_licensor_df.empty:
        st.write("route_licensor_link")
        st.dataframe(route_licensor_df, width='stretch')

    if not supplier_df.empty:
        st.write("supplier_master")
        st.dataframe(supplier_df, width='stretch')

    if not material_supplier_df.empty:
        st.write("material_supplier_link")
        st.dataframe(material_supplier_df, width='stretch')
