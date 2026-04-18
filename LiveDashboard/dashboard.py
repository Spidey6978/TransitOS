import streamlit as st
import sqlite3
import pandas as pd
import pydeck as pdk
import plotly.graph_objects as go
import time
import random
import requests
import json
from datetime import datetime

st.set_page_config(
    page_title="TransitDost",
    page_icon="🚦",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600&display=swap');

/* 🚨 HIDE ALL STREAMLIT CHROME FOR SEAMLESS IFRAME EMBEDDING 🚨 */
[data-testid="stSidebar"],
[data-testid="collapsedControl"],
header[data-testid="stHeader"],
footer {
    display: none !important;
}

html, body, [class*="css"] {
    font-family: 'Exo 2', sans-serif;
    background-color: #030712 !important;
    color: #e2e8f0 !important;
}

.main::before {
    content: '';
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: repeating-linear-gradient(
        0deg,transparent,transparent 2px,
        rgba(0,255,170,0.012) 2px,rgba(0,255,170,0.012) 4px
    );
    pointer-events: none;
    z-index: 9999;
}

.main .block-container {
    padding: 1.5rem 2.5rem !important;
    max-width: 100% !important;
    background: transparent !important;
}

/* ── TITLE ── */
.dashboard-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 2.6rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    background: linear-gradient(90deg,#00ffaa 0%,#00cfff 50%,#7c3aed 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.1;
    margin-bottom: 0;
}
.dashboard-subtitle {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.75rem;
    color: #475569 !important;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    margin-top: 0.2rem;
    margin-bottom: 1.5rem;
}

/* ── METRIC CARDS ── */
[data-testid="metric-container"] {
    background: linear-gradient(135deg,rgba(0,255,170,0.04) 0%,rgba(0,207,255,0.06) 100%) !important;
    border: 1px solid rgba(0,255,170,0.2) !important;
    border-radius: 12px !important;
    padding: 1rem 1.2rem !important;
    box-shadow: 0 0 20px rgba(0,255,170,0.05),inset 0 1px 0 rgba(255,255,255,0.04) !important;
}
[data-testid="metric-container"] label {
    font-family: 'Share Tech Mono', monospace !important;
    font-size: 0.65rem !important;
    letter-spacing: 0.2em !important;
    text-transform: uppercase !important;
    color: #64748b !important;
}
[data-testid="metric-container"] [data-testid="stMetricValue"] {
    font-family: 'Rajdhani', sans-serif !important;
    font-size: 2rem !important;
    font-weight: 700 !important;
    color: #00ffaa !important;
}

/* ── ECONOMIC KPI CARDS (4-MODES) ── */
.kpi-row {
    display: flex;
    gap: 14px;
    margin: 1rem 0;
    flex-wrap: wrap;
}
.kpi-card {
    flex: 1;
    min-width: 160px;
    background: linear-gradient(135deg,rgba(124,58,237,0.07) 0%,rgba(0,207,255,0.05) 100%);
    border: 1px solid rgba(124,58,237,0.25);
    border-radius: 12px;
    padding: 0.9rem 1.1rem;
    position: relative;
    overflow: hidden;
}
.kpi-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
}
.kpi-card.train-card { border-color: rgba(0,229,255,0.3); }
.kpi-card.train-card::before { background: linear-gradient(90deg,#00cfff,#00E5FF); }

.kpi-card.metro-card { border-color: rgba(168,85,247,0.3); }
.kpi-card.metro-card::before { background: linear-gradient(90deg,#7c3aed,#a855f7); }

.kpi-card.bus-card { border-color: rgba(16,185,129,0.3); }
.kpi-card.bus-card::before { background: linear-gradient(90deg,#059669,#10b981); }

.kpi-card.auto-card { border-color: rgba(255,140,0,0.3); }
.kpi-card.auto-card::before { background: linear-gradient(90deg,#FF8C00,#ffbe00); }

.kpi-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.58rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #475569;
    margin-bottom: 0.3rem;
}
.kpi-value {
    font-family: 'Rajdhani', sans-serif;
    font-size: 1.7rem;
    font-weight: 700;
    color: #e2e8f0;
    line-height: 1.1;
}
.kpi-value.train-val { color: #00E5FF; }
.kpi-value.metro-val { color: #a855f7; }
.kpi-value.bus-val   { color: #10b981; }
.kpi-value.auto-val  { color: #FF8C00; }

.kpi-sub {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.58rem;
    color: #334155;
    margin-top: 0.2rem;
}

/* ── MAP CONTROLS BAR ── */
.map-ctrl-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0.55rem 0.9rem;
    background: rgba(0,0,0,0.35);
    border: 1px solid rgba(0,255,170,0.1);
    border-radius: 10px;
    margin-bottom: 0.7rem;
    flex-wrap: wrap;
}

/* ── LEGEND ── */
.legend-row {
    display: flex;
    align-items: center;
    gap: 20px;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.68rem;
    letter-spacing: 0.1em;
    color: #64748b;
    margin: 0.4rem 0 0.8rem;
    flex-wrap: wrap;
}
.legend-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 5px;
    vertical-align: middle;
}
.legend-line {
    display: inline-block;
    width: 22px; height: 3px;
    border-radius: 2px;
    margin-right: 6px;
    vertical-align: middle;
}

/* ── MAP WRAPPER ── */
.map-wrapper {
    border: 1px solid rgba(0,255,170,0.15);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 0 40px rgba(0,255,170,0.06),0 0 80px rgba(124,58,237,0.04);
}

/* ── MISC ── */
h2, h3 {
    font-family: 'Rajdhani', sans-serif !important;
    letter-spacing: 0.08em !important;
    color: #cbd5e1 !important;
}
h3::before { content: '▸ '; color: #00ffaa; }

hr { border: none !important; border-top: 1px solid rgba(0,255,170,0.1) !important; margin: 1.5rem 0 !important; }

[data-testid="stDataFrame"] { border: 1px solid rgba(0,207,255,0.12) !important; border-radius: 10px !important; }
[data-testid="stAlert"] {
    background: rgba(251,191,36,0.05) !important;
    border: 1px solid rgba(251,191,36,0.25) !important;
    border-radius: 10px !important;
    font-family: 'Share Tech Mono', monospace !important;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #0a0f1e; }
::-webkit-scrollbar-thumb { background: rgba(0,255,170,0.3); border-radius: 3px; }

/* ── BUTTONS ── */
div.stButton > button {
    background-color: rgba(255, 45, 45, 0.1) !important;
    color: #ff2d2d !important;
    border: 1px solid rgba(255, 45, 45, 0.5) !important;
    width: 100% !important;
    font-family: 'Share Tech Mono', monospace !important;
    letter-spacing: 0.1em !important;
    padding: 0.8rem !important;
}
div.stButton > button:hover {
    background-color: rgba(255, 45, 45, 0.2) !important;
    border: 1px solid #ff2d2d !important;
    color: #fff !important;
}

/* ── RADIO (map view toggle) ── */
[data-testid="stRadio"] label {
    font-family: 'Share Tech Mono', monospace !important;
    font-size: 0.68rem !important;
    letter-spacing: 0.1em !important;
    color: #64748b !important;
}
[data-testid="stRadio"] > div { gap: 6px !important; }

/* ── LOADING / SPINNER ── */
.osrm-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.58rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #334155;
    margin-left: 10px;
}
.osrm-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #00ffaa;
    animation: blink 1.4s ease-in-out infinite;
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
</style>
""", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# DATA CONNECTION
# ══════════════════════════════════════════════════════════════════════════════

BASE_URL = "https://touchily-steamerless-alyssa.ngrok-free.dev"

@st.cache_data(ttl=2)
def load_data():
    try:
        res = requests.get(f"{BASE_URL}/ledger_live", timeout=2)
        if res.status_code != 200:
            return pd.DataFrame()
        df = pd.DataFrame(res.json())
        if df.empty:
            return df
        df = df.rename(columns={
            "start_lat": "olat",
            "start_lng": "olng",
            "end_lat":   "dlat",
            "end_lng":   "dlng",
        })
        return df
    except Exception:
        return pd.DataFrame()

@st.cache_data(ttl=2)
def fetch_stats():
    try:
        res = requests.get(f"{BASE_URL}/stats", timeout=2)
        if res.status_code == 200:
            return res.json()
    except Exception:
        pass
    return {"total_tickets": 0, "total_revenue_inr": 0, "unique_commuters": 0}

df = load_data()
global_stats = fetch_stats()

OLAT = "olat"
OLNG = "olng"
DLAT = "dlat"
DLNG = "dlng"

# ── 4-MODE NORMALISATION ──────────────────────────────────────────────────────
if not df.empty:
    def _normalise_mode(m):
        m = str(m).upper()
        if "TRAIN" in m or "RAIL" in m: return "TRAIN"
        if "METRO" in m or "MONO" in m: return "METRO"
        if "BUS" in m: return "BUS"
        return "AUTO"
    
    if "mode" in df.columns:
        df["mode"] = df["mode"].apply(_normalise_mode)
    else:
        df["mode"] = df.apply(lambda _: random.choice(["AUTO", "METRO", "TRAIN", "BUS"]), axis=1)

# ── RESTORED: OSRM Real-Road Fallback ─────────────────────────────────────────
@st.cache_data(ttl=300)
def fetch_osrm_route(lat1, lon1, lat2, lon2):
    """Fetch a real driving path from OSRM for old tickets that lack DB paths."""
    try:
        url = f"http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            if data.get("routes") and len(data["routes"]) > 0:
                coords = data["routes"][0]["geometry"]["coordinates"]
                return coords
    except Exception:
        pass
    return [[lon1, lat1], [lon2, lat2]]

@st.cache_data(ttl=120)
def build_paths(_df):
    """
    Extracts the path natively from the DB. 
    If missing, it falls back to the OSRM API to save the old tickets from being straight lines!
    """
    if _df.empty: return _df
    df_copy = _df.copy()
    paths = []
    seen = {}
    
    for _, row in df_copy.iterrows():
        # 1. Look for the DB path first
        if "route_path" in row and pd.notna(row["route_path"]):
            try:
                parsed = json.loads(row["route_path"]) if isinstance(row["route_path"], str) else row["route_path"]
                if parsed and isinstance(parsed, list) and len(parsed) > 0:
                    paths.append(parsed)
                    continue
            except Exception:
                pass
                
        # 2. Fallback to OSRM API if DB path is missing
        key = (round(row[OLAT], 4), round(row[OLNG], 4), round(row[DLAT], 4), round(row[DLNG], 4))
        if key not in seen:
            seen[key] = fetch_osrm_route(row[OLAT], row[OLNG], row[DLAT], row[DLNG])
        paths.append(seen[key])
        
    df_copy["path"] = paths
    return df_copy

# ── stats & economics ──────────────────────────────────────────────────────────
total_events   = len(df)
active_origins = df[[OLAT, OLNG]].drop_duplicates().shape[0] if not df.empty else 0
unique_dest    = df[[DLAT, DLNG]].drop_duplicates().shape[0] if not df.empty else 0
congestion_pct = min(int((1 - active_origins / max(total_events, 1)) * 100), 99) if total_events > 0 else 0

rev = {"AUTO": 0, "TRAIN": 0, "METRO": 0, "BUS": 0}
if not df.empty and "total_fare" in df.columns:
    for m in rev.keys():
        rev[m] = int(df[df["mode"] == m]["total_fare"].sum())
        
total_econ = sum(rev.values())

# ══════════════════════════════════════════════════════════════════════════════
# HEADER + CONTROLS
# ══════════════════════════════════════════════════════════════════════════════
title_col, ctrl_col = st.columns([5, 2])

with title_col:
    st.markdown(
        '<div class="dashboard-title">🚦 TransitDost Smart Traffic</div>'
        '<div class="dashboard-subtitle">Multi-Modal Telemetry Engine · MMR</div>',
        unsafe_allow_html=True,
    )

with ctrl_col:
    st.markdown("<div style='margin-top: 10px;'></div>", unsafe_allow_html=True)
    sc1, sc2 = st.columns([1, 1])
    with sc1:
        live_mode = st.toggle("🛰️ Satellite Link", value=True)
    with sc2:
        refresh_rate = st.slider("Freq (s)", 1, 10, 3, label_visibility="collapsed")

# ── KPI ROW 1: existing backend stats ─────────────────────────────────────────
c1, c2, c3, c4 = st.columns(4)
c1.metric("Confirmed Trips",  f"{global_stats['total_tickets']:,}",           delta="Live")
c2.metric("Revenue (INR)",    f"₹{global_stats['total_revenue_inr']:,}",      delta="Verified")
c3.metric("Unique Nodes",     f"{global_stats['unique_commuters']:,}")
c4.metric("Network Load",     f"{congestion_pct}%", delta="Nominal" if congestion_pct < 80 else "High")

# ── KPI ROW 2: 4-MODE ECONOMIC SPLIT ──────────────────────────────────────────
st.markdown(f"""
<div class="kpi-row">
    <div class="kpi-card train-card">
        <div class="kpi-label">🚆 Suburban Rail</div>
        <div class="kpi-value train-val">₹{rev['TRAIN']:,}</div>
        <div class="kpi-sub">TRAIN · {df[df['mode']=='TRAIN'].shape[0] if not df.empty else 0} trips</div>
    </div>
    <div class="kpi-card metro-card">
        <div class="kpi-label">🚇 Metro Rail</div>
        <div class="kpi-value metro-val">₹{rev['METRO']:,}</div>
        <div class="kpi-sub">METRO · {df[df['mode']=='METRO'].shape[0] if not df.empty else 0} trips</div>
    </div>
    <div class="kpi-card bus-card">
        <div class="kpi-label">🚌 BEST Bus</div>
        <div class="kpi-value bus-val">₹{rev['BUS']:,}</div>
        <div class="kpi-sub">BUS · {df[df['mode']=='BUS'].shape[0] if not df.empty else 0} trips</div>
    </div>
    <div class="kpi-card auto-card">
        <div class="kpi-label">🚗 Auto/Gig</div>
        <div class="kpi-value auto-val">₹{rev['AUTO']:,}</div>
        <div class="kpi-sub">AUTO · {df[df['mode']=='AUTO'].shape[0] if not df.empty else 0} trips</div>
    </div>
</div>
""", unsafe_allow_html=True)

st.markdown("---")

# ══════════════════════════════════════════════════════════════════════════════
# MAP
# ══════════════════════════════════════════════════════════════════════════════
if df.empty:
    st.warning("⚠ No traffic data detected. Awaiting live telemetry...")
else:
    st.markdown("### Live Traffic Map")

    route_keys = [OLAT, OLNG, DLAT, DLNG]
    df["_count"] = df.groupby(route_keys)[OLAT].transform("count")
    low_t  = df["_count"].quantile(0.40)
    high_t = df["_count"].quantile(0.75)
    df["_status"] = df["_count"].apply(
        lambda c: "Clear" if c <= low_t else ("Moderate" if c <= high_t else "Heavy")
    )

    ctrl_l, ctrl_r = st.columns([3, 2])
    with ctrl_l:
        view_mode = st.radio("Map View", ["All Routes", "Public Only (Train/Metro/Bus)", "Gig Only (Auto)"], horizontal=True)
    with ctrl_r:
        tog1, tog2 = st.columns(2)
        with tog1:
            show_heatmap = st.toggle("🌡 Heatmap", value=True)
        with tog2:
            use_osrm = st.toggle("🛣 Road Routing", value=True, help="Force OSRM routing for older DB entries")

    if use_osrm:
        with st.spinner("Extracting DB paths & fetching OSRM fallbacks…"):
            df = build_paths(df)
    else:
        df["path"] = df.apply(lambda r: [[r[OLNG], r[OLAT]], [r[DLNG], r[DLAT]]], axis=1)

    def make_path_layer(data, src_color, width=4):
        if data is None or data.empty: return None, None
        glow = pdk.Layer("PathLayer", data=data, get_path="path", get_color=src_color[:3] + [45], width_scale=20, width_min_pixels=8, pickable=False)
        line = pdk.Layer("PathLayer", data=data, get_path="path", get_color=src_color, width_scale=6, width_min_pixels=width, pickable=True, auto_highlight=True, highlight_color=[255, 255, 255, 200])
        return glow, line

    t_g, t_l = make_path_layer(df[df["mode"] == "TRAIN"], [0, 229, 255, 240], width=3)
    m_g, m_l = make_path_layer(df[df["mode"] == "METRO"], [168, 85, 247, 240], width=3)
    b_g, b_l = make_path_layer(df[df["mode"] == "BUS"],   [16, 185, 129, 240], width=3)
    a_g, a_l = make_path_layer(df[df["mode"] == "AUTO"],  [255, 140, 0, 240],  width=3)

    heatmap = pdk.Layer(
        "HeatmapLayer", data=df, get_position=[OLNG, OLAT], radius_pixels=60, intensity=2.5, threshold=0.05,
        color_range=[[0,20,60,0], [0,100,200,60], [0,200,255,110], [0,255,170,160], [255,200,0,190], [255,60,60,210]], aggregation="SUM"
    )

    origins = pdk.Layer("ScatterplotLayer", data=df, get_position=[OLNG, OLAT], get_radius=180, get_fill_color=[0, 220, 255, 240], stroked=True, get_line_color=[255, 255, 255, 160], line_width_min_pixels=1, pickable=False)
    destinations = pdk.Layer("ScatterplotLayer", data=df, get_position=[DLNG, DLAT], get_radius=180, get_fill_color=[255, 45, 45, 240], stroked=True, get_line_color=[255, 255, 255, 160], line_width_min_pixels=1, pickable=False)

    layers = []
    if show_heatmap: layers.append(heatmap)

    if view_mode in ("All Routes", "Gig Only (Auto)"):
        layers.extend([l for l in [a_g, a_l] if l is not None])
    if view_mode in ("All Routes", "Public Only (Train/Metro/Bus)"):
        layers.extend([l for l in [t_g, t_l, m_g, m_l, b_g, b_l] if l is not None])

    layers += [origins, destinations]

    deck = pdk.Deck(
        layers=layers,
        initial_view_state=pdk.ViewState(latitude=19.0760, longitude=72.8777, zoom=11, pitch=45, bearing=0),
        map_style="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        tooltip={
            "html": (
                "<div style='font-family:Share Tech Mono,monospace;font-size:11px;background:#0a0f1e;border:1px solid rgba(0,255,170,0.25);padding:10px 14px;border-radius:8px;color:#e2e8f0;line-height:2'>"
                "📍 <span style='color:#00dcff'>Origin</span><br><b>{start_station}</b><br>"
                "🎯 <span style='color:#ff2d2d'>Destination</span><br><b>{end_station}</b><br>"
                "🚗 Mode: <b>{mode}</b><br>🚦 Status: <b>{_status}</b>"
                "</div>"
            ),
            "style": {"background": "transparent", "border": "none"},
        },
    )

    osrm_label = '<span class="osrm-badge"><span class="osrm-dot"></span>OSRM Road Routing Active</span>' if use_osrm else ""
    st.markdown(f"""
        <div class="legend-row">
            <span><span class="legend-line" style="background:#00E5FF"></span>Train</span>
            <span><span class="legend-line" style="background:#a855f7"></span>Metro</span>
            <span><span class="legend-line" style="background:#10b981"></span>Bus</span>
            <span><span class="legend-line" style="background:#FF8C00"></span>Auto/Gig</span>
            &nbsp;·&nbsp;
            <span><span class="legend-dot" style="background:#00dcff;outline:2px solid #fff;outline-offset:1px"></span>Origin</span>
            <span><span class="legend-dot" style="background:#ff2d2d;outline:2px solid #fff;outline-offset:1px"></span>Destination</span>
            {osrm_label}
        </div>
    """, unsafe_allow_html=True)

    st.markdown('<div class="map-wrapper">', unsafe_allow_html=True)
    st.pydeck_chart(deck, use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# RESTORED: CHART + TABLE
# ══════════════════════════════════════════════════════════════════════════════
if not df.empty:
    st.markdown("---")
    col_table = st.columns([1])[0]  # Or simply: col_table, = st.columns(1)  # Full width
    with col_table:
        st.markdown("### Recent Trips")
        show_cols = [c for c in ["start_station", "end_station", "mode", "total_fare", "_status"] if c in df.columns]
        rename_map = {"start_station": "Origin", "end_station": "Destination", "mode": "Mode", "total_fare": "Fare (₹)", "_status": "Status"}
        st.dataframe(df[show_cols].rename(columns=rename_map).tail(12).reset_index(drop=True), use_container_width=True, height=290)

# ══════════════════════════════════════════════════════════════════════════════
# EMERGENCY RESET & AUTO-REFRESH
# ══════════════════════════════════════════════════════════════════════════════
st.markdown("---")
st.markdown("<div style='margin-bottom: 20px;'></div>", unsafe_allow_html=True)

_, reset_col, _ = st.columns([1, 2, 1])
with reset_col:
    if st.button("🚨 EMERGENCY RESET", use_container_width=True):
        try:
            requests.post(f"{BASE_URL}/reset_db", timeout=5)
            st.toast("Database Reset Successful!", icon="✅")
            time.sleep(1)
            st.rerun()
        except Exception as e:
            st.error(f"Failed to reset: {e}")

if live_mode:
    time.sleep(refresh_rate)
    st.rerun()