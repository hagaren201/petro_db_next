
from collections import defaultdict
from pathlib import Path
import os

import pandas as pd
import plotly.graph_objects as go
import streamlit as st


st.set_page_config(page_title="Derivative Shortlist", layout="wide")

# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_FILE = BASE_DIR / "db.xlsx"
DEFAULT_TRADE_FILE = BASE_DIR / "trade.xlsx"

ROOT_OPTIONS = ["All", "Ethylene", "Propylene", "C4", "Aromatics", "Methanol"]


CATEGORY_ORDER = {
    "Ethylene": 1,
    "Propylene": 2,
    "C4": 3,
    "Aromatics": 4,
    "Methanol": 5,
}

AROMATICS_GROUPS = {"Aromatics", "Benzene", "Toluene", "Xylene"}


def normalize_category_name(group_name: str) -> str:
    group_name = s(group_name)
    if group_name in AROMATICS_GROUPS:
        return "Aromatics"
    return group_name


# ------------------------------------------------------------
# Utils
# ------------------------------------------------------------
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


def yn(flag: bool) -> str:
    return "O" if flag else "X"


def normalize_hsk(x):
    text = s(x)
    if not text:
        return ""
    text = text.replace(".0", "").replace(",", "").strip()
    return text


def safe_num(x):
    try:
        if x == "":
            return 0.0
        return float(str(x).replace(",", ""))
    except Exception:
        return 0.0


# ------------------------------------------------------------
# Loaders
# ------------------------------------------------------------
@st.cache_data
def load_db_data(file_path: str):
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


@st.cache_data
def load_trade_data(file_path: str):
    xls = pd.ExcelFile(file_path)

    if "trade" not in xls.sheet_names or "raw" not in xls.sheet_names:
        raise ValueError("trade.xlsx must include 'trade' and 'raw' sheets")

    trade_map_df = clean_df(pd.read_excel(file_path, sheet_name="trade"))
    raw_df = clean_df(pd.read_excel(file_path, sheet_name="raw"))

    if "material_master" in xls.sheet_names:
        trade_material_df = clean_df(pd.read_excel(file_path, sheet_name="material_master"))
    else:
        trade_material_df = pd.DataFrame()

    if "hsk10" in trade_map_df.columns:
        trade_map_df["hsk10"] = trade_map_df["hsk10"].map(normalize_hsk)
    if "hsk10" in raw_df.columns:
        raw_df["hsk10"] = raw_df["hsk10"].map(normalize_hsk)

    if "year" in raw_df.columns:
        raw_df["year"] = raw_df["year"].map(lambda x: int(float(x)) if s(x) else None)

    for col in ["export", "import", "diff"]:
        if col in raw_df.columns:
            raw_df[col] = raw_df[col].map(safe_num)

    return trade_map_df, raw_df, trade_material_df


# ------------------------------------------------------------
# Maps
# ------------------------------------------------------------
def build_material_lookup(material_df: pd.DataFrame):
    material_by_id = {}
    for _, row in material_df.iterrows():
        mid = row.get("material_id", "")
        if not mid:
            continue
        material_by_id[mid] = {
            "material_name": row.get("material_name", mid),
            "material_group": row.get("material_group", ""),
            "material_type": row.get("material_type", ""),
            "vertical_order": row.get("vertical_order", ""),
            "remarks": row.get("remarks", ""),
            "visual_exclude": row.get("visual_exclude", ""),
        }
    return material_by_id


def build_route_licensor_map(licensor_df: pd.DataFrame, route_licensor_df: pd.DataFrame):
    licensor_name_by_id = {}
    if not licensor_df.empty:
        licensor_name_col = "licensor_name" if "licensor_name" in licensor_df.columns else None
        for _, row in licensor_df.iterrows():
            lid = row.get("licensor_id", "")
            if not lid:
                continue
            licensor_name_by_id[lid] = row.get(licensor_name_col, lid) if licensor_name_col else lid

    route_licensors = defaultdict(list)
    if not route_licensor_df.empty:
        for _, row in route_licensor_df.iterrows():
            rid = row.get("route_id", "")
            lid = row.get("licensor_id", "")
            if not rid or not lid:
                continue
            route_licensors[rid].append(licensor_name_by_id.get(lid, lid))

    cleaned = {}
    for rid, items in route_licensors.items():
        cleaned[rid] = sorted(set([x for x in items if x]))
    return cleaned


def build_output_licensor_map(output_df: pd.DataFrame, route_licensors: dict):
    material_to_licensors = defaultdict(set)
    if output_df.empty:
        return {}

    for _, row in output_df.iterrows():
        rid = row.get("route_id", "")
        mid = row.get("material_id", "")
        if not rid or not mid:
            continue
        for lic in route_licensors.get(rid, []):
            material_to_licensors[mid].add(lic)

    return {k: sorted(v) for k, v in material_to_licensors.items()}



def build_supplier_info(supplier_df: pd.DataFrame, material_supplier_df: pd.DataFrame):
    supplier_name_by_id = {}

    if not supplier_df.empty:
        for _, row in supplier_df.iterrows():
            sid = row.get("supplier_id", "")
            if sid:
                supplier_name_by_id[sid] = row.get("supplier_name", sid)

    info_by_material = {}

    if material_supplier_df.empty:
        return info_by_material

    for _, row in material_supplier_df.iterrows():
        mid = row.get("material_id", "")
        if not mid:
            continue

        supplier_id = row.get("supplier_id", "")
        supplier_name = supplier_name_by_id.get(supplier_id, supplier_id)
        location = row.get("location", "")
        capacity_raw = row.get("estimated_capacity", "")
        capacity_unit = row.get("capacity_unit", "")

        if mid not in info_by_material:
            info_by_material[mid] = {
                "supplier_names": set(),
                "ulsan_supplier_names": set(),
                "capacity_sum": 0.0,
                "capacity_units": [],
                "has_capacity": False,
            }

        info = info_by_material[mid]

        if supplier_name:
            info["supplier_names"].add(supplier_name)
            if location == "울산":
                info["ulsan_supplier_names"].add(supplier_name)

        cap = safe_num(capacity_raw)
        if cap:
            info["capacity_sum"] += cap
            info["has_capacity"] = True

        if capacity_unit and capacity_unit not in info["capacity_units"]:
            info["capacity_units"].append(capacity_unit)

    cleaned = {}
    for mid, info in info_by_material.items():
        supplier_names = sorted(info["supplier_names"])
        ulsan_supplier_names = sorted(info["ulsan_supplier_names"])
        unit_text = "/".join(info["capacity_units"]).strip()

        if info["has_capacity"]:
            cap_value = info["capacity_sum"]
            cap_text = f"{int(cap_value):,}" if abs(cap_value - round(cap_value)) < 1e-9 else f"{cap_value:,.1f}"
            if unit_text:
                cap_text = f"{cap_text} {unit_text}"
        else:
            cap_text = ""

        cleaned[mid] = {
            "has_domestic_supplier": bool(supplier_names),
            "has_ulsan_supplier": bool(ulsan_supplier_names),
            "domestic_supplier_names": ", ".join(supplier_names) if supplier_names else "X",
            "ulsan_supplier_names": ", ".join(ulsan_supplier_names) if ulsan_supplier_names else "X",
            "domestic_capacity": cap_text if cap_text else "X",
        }

    return cleaned


    for _, row in material_supplier_df.iterrows():
        mid = row.get("material_id", "")
        if not mid:
            continue
        domestic_set.add(mid)
        if row.get("location", "") == "울산":
            ulsan_set.add(mid)

    return domestic_set, ulsan_set


# ------------------------------------------------------------
# Trade summary
# ------------------------------------------------------------
def build_trade_summary(trade_map_df: pd.DataFrame, raw_df: pd.DataFrame, threshold: float = 0.0):
    if trade_map_df.empty:
        return pd.DataFrame()

    latest_year_by_hsk = {}
    latest_export_by_hsk = {}
    latest_import_by_hsk = {}
    latest_net_by_hsk = {}
    regime_by_hsk = {}
    turn_flag_by_hsk = {}

    if not raw_df.empty:
        work = raw_df.copy()
        work = work[work["hsk10"] != ""].copy()
        years = sorted([y for y in work["year"].dropna().unique().tolist() if y is not None])

        for hsk, grp in work.groupby("hsk10"):
            grp = grp.sort_values("year")
            if grp.empty:
                continue

            latest = grp.iloc[-1]
            latest_year = int(latest["year"])
            latest_export = float(latest.get("export", 0.0))
            latest_import = float(latest.get("import", 0.0))
            latest_net = latest_export - latest_import

            latest_year_by_hsk[hsk] = latest_year
            latest_export_by_hsk[hsk] = latest_export
            latest_import_by_hsk[hsk] = latest_import
            latest_net_by_hsk[hsk] = latest_net

            signs = []
            for _, r in grp.iterrows():
                net = float(r.get("export", 0.0)) - float(r.get("import", 0.0))
                if abs(net) <= threshold:
                    signs.append(0)
                elif net > 0:
                    signs.append(1)
                else:
                    signs.append(-1)

            non_zero_signs = [x for x in signs if x != 0]
            if not non_zero_signs:
                regime = "Balanced"
            elif all(x > 0 for x in non_zero_signs):
                regime = "Stable exporter"
            elif all(x < 0 for x in non_zero_signs):
                regime = "Stable importer"
            elif non_zero_signs[0] > 0 and non_zero_signs[-1] < 0:
                regime = "Exporter → importer"
            elif non_zero_signs[0] < 0 and non_zero_signs[-1] > 0:
                regime = "Importer → exporter"
            else:
                regime = "Mixed / volatile"

            regime_by_hsk[hsk] = regime
            turn_flag_by_hsk[hsk] = "Y" if "→" in regime else "N"

    out = trade_map_df.copy()
    out["latest_year"] = out["hsk10"].map(latest_year_by_hsk)
    out["export_latest"] = out["hsk10"].map(latest_export_by_hsk)
    out["import_latest"] = out["hsk10"].map(latest_import_by_hsk)
    out["net_latest"] = out["hsk10"].map(latest_net_by_hsk)
    out["trade_regime"] = out["hsk10"].map(regime_by_hsk)

    def classify_status(net, latest_year):
        if pd.isna(latest_year):
            return "No trade data"
        if pd.isna(net):
            return "No trade data"
        if abs(net) <= threshold:
            return "Balanced"
        return "Net export" if net > 0 else "Net import"

    out["trade_status"] = out.apply(lambda r: classify_status(r.get("net_latest"), r.get("latest_year")), axis=1)
    out["turn_flag"] = out["hsk10"].map(turn_flag_by_hsk).fillna("N")
    out["trade_key"] = out["trade_status"].map(
        {
            "Net import": 1,
            "Balanced": 2,
            "Net export": 3,
            "No trade data": 4,
        }
    ).fillna(9)

    return out


# ------------------------------------------------------------
# Shortlist table
# ------------------------------------------------------------


def build_shortlist_table(
    material_df: pd.DataFrame,
    material_by_id: dict,
    output_licensor_map: dict,
    supplier_info_by_material: dict,
    trade_summary_df: pd.DataFrame,
):
    trade_cols = [
        "material_id",
        "hsk10",
        "material_name_hsk",
        "latest_year",
        "trade_status",
        "trade_regime",
        "turn_flag",
        "export_latest",
        "import_latest",
        "net_latest",
        "trade_key",
    ]
    trade_join = trade_summary_df[trade_cols].drop_duplicates(subset=["material_id"]) if not trade_summary_df.empty else pd.DataFrame(columns=trade_cols)

    base = material_df.copy()
    base = base[base["material_id"] != ""].copy()
    base["category_display"] = base["material_group"].map(normalize_category_name)
    base["category_order"] = base["category_display"].map(CATEGORY_ORDER).fillna(99)
    base["licensor_list"] = base["material_id"].map(lambda x: ", ".join(output_licensor_map.get(x, [])))
    base["licensable"] = base["material_id"].map(lambda x: "Y" if len(output_licensor_map.get(x, [])) > 0 else "N")
    base["has_domestic_supplier"] = base["material_id"].map(lambda x: "Y" if supplier_info_by_material.get(x, {}).get("has_domestic_supplier", False) else "N")
    base["has_ulsan_supplier"] = base["material_id"].map(lambda x: "Y" if supplier_info_by_material.get(x, {}).get("has_ulsan_supplier", False) else "N")
    base["domestic_supplier"] = base["material_id"].map(lambda x: supplier_info_by_material.get(x, {}).get("domestic_supplier_names", "X"))
    base["ulsan_supplier"] = base["material_id"].map(lambda x: supplier_info_by_material.get(x, {}).get("ulsan_supplier_names", "X"))
    base["domestic_capacity"] = base["material_id"].map(lambda x: supplier_info_by_material.get(x, {}).get("domestic_capacity", "X"))

    def format_domestic_supplier_display(row):
        names = row.get("domestic_supplier", "X")
        capacity = row.get("domestic_capacity", "X")
        if names == "X":
            return "X"
        if capacity != "X":
            return f"{names} ({capacity})"
        return names

    base["domestic_supplier_display"] = base.apply(format_domestic_supplier_display, axis=1)

    merged = base.merge(trade_join, on="material_id", how="left")

    merged["trade_status"] = merged["trade_status"].fillna("No trade data")
    merged["trade_regime"] = merged["trade_regime"].fillna("No trade data")
    merged["turn_flag"] = merged["turn_flag"].fillna("N")
    merged["trade_key"] = merged["trade_key"].fillna(9)

    def axl_flag(licensor_text: str) -> str:
        text = s(licensor_text).lower()
        return "Y" if ("axens" in text or "lummus" in text) else "N"

    merged["axens_lummus_flag"] = merged["licensor_list"].map(axl_flag)

    def priority_bucket(row):
        if row["licensable"] != "Y":
            return "E"

        axl = row["axens_lummus_flag"] == "Y"
        trade = row["trade_status"]
        has_domestic = row["has_domestic_supplier"] == "Y"

        if axl and trade == "Net import":
            return "A"
        if axl and trade in ["No trade data", "Net export", "Balanced"] and has_domestic:
            return "B"
        if (not axl) and trade == "Net import":
            return "C"
        if (not axl) and trade in ["No trade data", "Net export", "Balanced"] and has_domestic:
            return "D"
        return "E"

    merged["priority"] = merged.apply(priority_bucket, axis=1)
    merged["priority_rank"] = merged["priority"].map({"A": 1, "B": 2, "C": 3, "D": 4, "E": 5}).fillna(9)

    return merged



def apply_filters(df: pd.DataFrame, selected_group: str, licensable_only: bool, trade_filter: list, priority_filter: list):
    out = df.copy()

    if selected_group != "All":
        out = out[out["category_display"] == selected_group].copy()

    if licensable_only:
        out = out[out["licensable"] == "Y"].copy()

    if trade_filter:
        out = out[out["trade_status"].isin(trade_filter)].copy()

    if priority_filter:
        out = out[out["priority"].isin(priority_filter)].copy()

    out = out.sort_values(
        ["priority_rank", "category_order", "material_name"],
        ascending=[True, True, True]
    ).reset_index(drop=True)

    return out


# ------------------------------------------------------------
# Charts
# ------------------------------------------------------------
def build_trade_flow_chart(raw_df: pd.DataFrame, trade_summary_df: pd.DataFrame, material_id: str, material_name: str):
    hsk_rows = trade_summary_df[trade_summary_df["material_id"] == material_id].copy()
    hsk_rows = hsk_rows[hsk_rows["hsk10"] != ""].copy()

    fig = go.Figure()

    if hsk_rows.empty:
        fig.update_layout(
            height=380,
            title=f"{material_name} - No trade data",
            xaxis=dict(visible=False),
            yaxis=dict(visible=False),
            plot_bgcolor="white",
            paper_bgcolor="white",
        )
        return fig, pd.DataFrame()

    hsk_list = hsk_rows["hsk10"].drop_duplicates().tolist()
    chart_df = raw_df[raw_df["hsk10"].isin(hsk_list)].copy()

    if chart_df.empty:
        fig.update_layout(
            height=380,
            title=f"{material_name} - No trade data",
            xaxis=dict(visible=False),
            yaxis=dict(visible=False),
            plot_bgcolor="white",
            paper_bgcolor="white",
        )
        return fig, pd.DataFrame()

    agg = chart_df.groupby("year", as_index=False)[["export", "import"]].sum()
    agg["net"] = agg["export"] - agg["import"]
    agg = agg.sort_values("year")

    fig.add_trace(
        go.Bar(
            x=agg["year"],
            y=agg["export"],
            name="Export",
            hovertemplate="Year=%{x}<br>Export=%{y:,.1f}<extra></extra>",
        )
    )
    fig.add_trace(
        go.Bar(
            x=agg["year"],
            y=agg["import"],
            name="Import",
            hovertemplate="Year=%{x}<br>Import=%{y:,.1f}<extra></extra>",
        )
    )
    fig.add_trace(
        go.Scatter(
            x=agg["year"],
            y=agg["net"],
            mode="lines+markers",
            name="Net export",
            yaxis="y2",
            hovertemplate="Year=%{x}<br>Net=%{y:,.1f}<extra></extra>",
        )
    )

    fig.add_hline(y=0, line_width=1, line_dash="dot", opacity=0.5, yref="y2")

    title_suffix = ", ".join(
        [
            f"{row['hsk10']} ({row['material_name_hsk']})"
            for _, row in hsk_rows[["hsk10", "material_name_hsk"]].drop_duplicates().iterrows()
        ]
    )

    fig.update_layout(
        title=f"{material_name} trade flow<br><sup>{title_suffix}</sup>",
        barmode="group",
        height=470,
        plot_bgcolor="white",
        paper_bgcolor="white",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        xaxis=dict(title="Year", tickmode="linear"),
        yaxis=dict(title="Export / Import"),
        yaxis2=dict(title="Net export", overlaying="y", side="right"),
        margin=dict(l=20, r=20, t=70, b=20),
    )

    return fig, agg


def build_trade_comment(agg: pd.DataFrame):
    if agg.empty:
        return "무역 데이터가 없습니다."

    latest = agg.iloc[-1]
    latest_net = latest["net"]

    if latest_net > 0:
        status = "최근 기준 순수출 품목입니다."
    elif latest_net < 0:
        status = "최근 기준 순수입 품목입니다."
    else:
        status = "최근 기준 수출입 균형 상태입니다."

    signs = []
    for _, row in agg.iterrows():
        if row["net"] > 0:
            signs.append(1)
        elif row["net"] < 0:
            signs.append(-1)
        else:
            signs.append(0)

    non_zero = [x for x in signs if x != 0]
    if len(non_zero) >= 2 and non_zero[0] > 0 and non_zero[-1] < 0:
        regime = "과거 순수출에서 최근 순수입으로 전환된 흐름이 보여 구조 악화 여부를 점검할 필요가 있습니다."
    elif len(non_zero) >= 2 and non_zero[0] < 0 and non_zero[-1] > 0:
        regime = "과거 순수입에서 최근 순수출로 개선된 흐름이 보입니다."
    elif non_zero and all(x < 0 for x in non_zero):
        regime = "관측 기간 전반에 걸쳐 순수입 구조가 지속되고 있습니다."
    elif non_zero and all(x > 0 for x in non_zero):
        regime = "관측 기간 전반에 걸쳐 순수출 구조가 유지되고 있습니다."
    else:
        regime = "관측 기간 중 수출입 구조 변동성이 존재합니다."

    return f"{status} {regime}"


# ------------------------------------------------------------
# UI
# ------------------------------------------------------------
st.title("Derivative Shortlist")
st.caption("Priority shortlist with product drill-down")
st.caption("Licensor / Trade / Supplier 조건을 한 번에 확인하고, 선택 제품의 trade flow를 아래에서 확인하는 screening page")

uploaded_db = st.sidebar.file_uploader("Upload DB", type=["xlsx"], key="shortlist_db")
uploaded_trade = st.sidebar.file_uploader("Upload Trade", type=["xlsx"], key="shortlist_trade")

db_file = str(uploaded_db) if uploaded_db is not None else str(DEFAULT_DB_FILE)
trade_file = str(uploaded_trade) if uploaded_trade is not None else str(DEFAULT_TRADE_FILE)

if uploaded_db is None and not DEFAULT_DB_FILE.exists():
    st.warning(f"현재 폴더에 {DEFAULT_DB_FILE} 가 없습니다. 업로드해 주세요.")
    st.stop()

if uploaded_trade is None and not DEFAULT_TRADE_FILE.exists():
    st.warning(f"현재 폴더에 {DEFAULT_TRADE_FILE} 가 없습니다. 업로드해 주세요.")
    st.stop()

try:
    material_df, route_df, input_df, output_df, licensor_df, route_licensor_df, supplier_df, material_supplier_df = load_db_data(db_file)
    trade_map_df, raw_df, trade_material_df = load_trade_data(trade_file)
except Exception as e:
    st.error(f"파일 읽기 오류: {e}")
    st.stop()

material_by_id = build_material_lookup(material_df)
route_licensors = build_route_licensor_map(licensor_df, route_licensor_df)
output_licensor_map = build_output_licensor_map(output_df, route_licensors)
supplier_info_by_material = build_supplier_info(supplier_df, material_supplier_df)

st.sidebar.markdown("---")
st.sidebar.subheader("Screening filters")


selected_group = st.sidebar.selectbox("Category", ROOT_OPTIONS, index=0)
licensable_only = st.sidebar.checkbox("Licensable only", value=True)
trade_filter = st.sidebar.multiselect(
    "Trade status",
    ["Net import", "Balanced", "Net export", "No trade data"],
    default=["Net import", "No trade data"],
)
priority_filter = st.sidebar.multiselect(
    "Priority",
    ["A", "B", "C", "D", "E"],
    default=["A", "B", "C", "D"],
)
net_threshold = st.sidebar.number_input("Net trade threshold", min_value=0.0, value=0.0, step=100.0)

trade_summary_df = build_trade_summary(trade_map_df, raw_df, threshold=net_threshold)
shortlist_df = build_shortlist_table(
    material_df=material_df,
    material_by_id=material_by_id,
    output_licensor_map=output_licensor_map,
    supplier_info_by_material=supplier_info_by_material,
    trade_summary_df=trade_summary_df,
)

filtered_df = apply_filters(
    shortlist_df,
    selected_group=selected_group,
    licensable_only=licensable_only,
    trade_filter=trade_filter,
    priority_filter=priority_filter,
)

k1, k2, k3, k4 = st.columns(4)
k1.metric("Priority A", int((filtered_df["priority"] == "A").sum()) if not filtered_df.empty else 0)
k2.metric("Priority B", int((filtered_df["priority"] == "B").sum()) if not filtered_df.empty else 0)
k3.metric("Priority C", int((filtered_df["priority"] == "C").sum()) if not filtered_df.empty else 0)
k4.metric("Priority D", int((filtered_df["priority"] == "D").sum()) if not filtered_df.empty else 0)

left, right = st.columns([4.2, 1.8])

with left:
    st.subheader("Shortlist table")
    display_cols = [
        "priority",
        "category_display",
        "material_name",
        "licensor_list",
        "domestic_supplier_display",
        "trade_status",
    ]
    display_df = filtered_df[display_cols].copy()
    display_df.columns = ["Priority", "Category", "Product", "Licensor list", "Domestic supplier", "Trade status"]
    st.dataframe(display_df, width="stretch", hide_index=True)

with right:
    st.subheader("Quick guide")
    st.markdown(
        """
- **A**: Axens/Lummus + net import  
- **B**: Axens/Lummus + no trade data/export + domestic supplier  
- **C**: Other licensors + net import  
- **D**: Other licensors + no trade data/export + domestic supplier  
- **E**: Other licensable cases  
        """
    )
    st.caption("상단 카드(KPI)는 현재 필터 기준으로 각 Priority에 몇 개가 남아 있는지 보여주는 요약치입니다.")

st.markdown("---")
st.subheader("Selected product trade flow")

if filtered_df.empty:
    st.info("현재 필터 조건에 해당하는 제품이 없습니다.")
    st.stop()

product_options = [
    f"{row.priority} | {row.category_display} | {row.material_name}"
    for row in filtered_df[["priority", "category_display", "material_name"]].drop_duplicates().itertuples(index=False)
]
selected_label = st.selectbox("Select product", product_options, index=0)

selected_priority, selected_group_name, selected_material_name = [x.strip() for x in selected_label.split("|", 2)]
selected_row = filtered_df[
    (filtered_df["priority"] == selected_priority) &
    (filtered_df["category_display"] == selected_group_name) &
    (filtered_df["material_name"] == selected_material_name)
].iloc[0]
selected_material_id = selected_row["material_id"]

info1, info2, info3, info4, info5 = st.columns(5)
info1.metric("Priority", selected_row["priority"])
info2.metric("Category", selected_row["category_display"])
info3.metric("Product", selected_row["material_name"])
info4.metric("Trade status", selected_row["trade_status"])
info5.metric("Trade regime", selected_row["trade_regime"])

st.caption(f"Licensor list: {selected_row['licensor_list'] if s(selected_row['licensor_list']) else '-'}")
st.caption(f"Domestic supplier detail: {selected_row.get('domestic_supplier_display', 'X')}")

fig, agg_df = build_trade_flow_chart(raw_df, trade_summary_df, selected_material_id, selected_material_name)
st.plotly_chart(fig, width="stretch")

comment = build_trade_comment(agg_df)
st.info(comment)

with st.expander("Detailed screening data for selected product"):
    detail_cols = [
        "priority",
        "material_id",
        "category_display",
        "material_name",
        "material_type",
        "licensable",
        "axens_lummus_flag",
        "licensor_list",
        "domestic_supplier",
        "domestic_capacity",
        "ulsan_supplier",
        "hsk10",
        "latest_year",
        "trade_status",
        "trade_regime",
        "export_latest",
        "import_latest",
        "net_latest",
    ]
    available_detail_cols = [c for c in detail_cols if c in filtered_df.columns]
    detail_df = filtered_df[filtered_df["material_id"] == selected_material_id][available_detail_cols].copy()
    st.dataframe(detail_df, width="stretch", hide_index=True)
