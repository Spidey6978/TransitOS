import streamlit as st
import sqlite3
import pandas as pd
import pydeck as pdk
import plotly.graph_objects as go
import time
import requests
from datetime import datetime

st.set_page_config(
    page_title="TransitOS",
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
    background: repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,170,0.012) 2px,rgba(0,255,170,0.012) 4px);
    pointer-events: none;
    z-index: 9999;
}

.main .block-container {
    padding: 1.5rem 2.5rem !important; /* Adjusted to sit flush without header */
    max-width: 100% !important;
    background: transparent !important;
}
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
h2, h3 { font-family: 'Rajdhani', sans-serif !important; letter-spacing: 0.08em !important; color: #cbd5e1 !important; }
h3::before { content: '▸ '; color: #00ffaa; }
.map-wrapper {
    border: 1px solid rgba(0,255,170,0.15);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 0 40px rgba(0,255,170,0.06),0 0 80px rgba(124,58,237,0.04);
}
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
hr { border: none !important; border-top: 1px solid rgba(0,255,170,0.1) !important; margin: 1.5rem 0 !important; }
[data-testid="stDataFrame"] { border: 1px solid rgba(0,207,255,0.12) !important; border-radius: 10px !important; }
[data-testid="stAlert"] { background: rgba(251,191,36,0.05) !important; border: 1px solid rgba(251,191,36,0.25) !important; border-radius: 10px !important; font-family: 'Share Tech Mono', monospace !important; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #0a0f1e; }
::-webkit-scrollbar-thumb { background: rgba(0,255,170,0.3); border-radius: 3px; }

/* Custom red button styling for the Emergency Reset */
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
</style>
""", unsafe_allow_html=True)

# ── data connection ────────────────────────────────────────────────────────────

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

total_events   = len(df)
active_origins = df[[OLAT, OLNG]].drop_duplicates().shape[0] if not df.empty else 0
unique_dest    = df[[DLAT, DLNG]].drop_duplicates().shape[0] if not df.empty else 0
congestion_pct = min(int((1 - active_origins / max(total_events, 1)) * 100), 99) if total_events > 0 else 0

# ══════════════════════════════════════════════════════════════════════════════
# HEADER + KPIs + CONTROLS (Moved to main view)
# ══════════════════════════════════════════════════════════════════════════════
# Using a 5:2 ratio gives the toggles plenty of room next to the title
title_col, ctrl_col = st.columns([5, 2])

with title_col:
    st.markdown(
        '<div class="dashboard-title">🚦 TransitOS Smart Traffic</div>'
        '<div class="dashboard-subtitle">Real-Time Urban Mobility Intelligence · Mumbai Metropolitan Region</div>',
        unsafe_allow_html=True,
    )

with ctrl_col:
    st.markdown("<div style='margin-top: 10px;'></div>", unsafe_allow_html=True)
    sc1, sc2 = st.columns([1, 1])
    with sc1:
        live_mode = st.toggle("🛰️ Satellite Link", value=True)
    with sc2:
        refresh_rate = st.slider("Freq (s)", 1, 10, 3, label_visibility="collapsed")

c1, c2, c3, c4 = st.columns(4)
c1.metric("Confirmed Trips",     f"{global_stats['total_tickets']:,}",   delta="Live")
c2.metric("Revenue (INR)",       f"₹{global_stats['total_revenue_inr']:,}", delta="Verified")
c3.metric("Unique Nodes",        f"{global_stats['unique_commuters']:,}")
c4.metric("Network Load",        f"{congestion_pct}%",  delta="Nominal" if congestion_pct < 80 else "High")

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

    df_clear    = df[df["_status"] == "Clear"].copy()
    df_moderate = df[df["_status"] == "Moderate"].copy()
    df_heavy    = df[df["_status"] == "Heavy"].copy()

    def make_line_layers(data, r, g, b):
        if data is None or data.empty:
            return None, None
        glow = pdk.Layer(
            "LineLayer",
            data=data,
            get_source_position=[OLNG, OLAT], 
            get_target_position=[DLNG, DLAT],
            get_color=[r, g, b, 55],            
            get_width=18,
            pickable=False,
        )
        line = pdk.Layer(
            "LineLayer",
            data=data,
            get_source_position=[OLNG, OLAT],
            get_target_position=[DLNG, DLAT],
            get_color=[r, g, b, 230],           
            get_width=4,
            pickable=True,
            auto_highlight=True,
            highlight_color=[255, 255, 255, 220],
        )
        return glow, line

    g_clear,    l_clear    = make_line_layers(df_clear,    0,   220, 255)   
    g_moderate, l_moderate = make_line_layers(df_moderate, 255, 190, 0)    
    g_heavy,    l_heavy    = make_line_layers(df_heavy,    255, 45,  45)    

    heatmap = pdk.Layer(
        "HeatmapLayer",
        data=df,
        get_position=[OLNG, OLAT],
        radiusPixels=55,
        opacity=0.18,
        color_range=[
            [0,   20,  60,  0  ],
            [0,   100, 200, 50 ],
            [0,   200, 255, 90 ],
            [0,   255, 170, 130],
            [255, 200, 0,   160],
            [255, 60,  60,  180],
        ],
    )

    origins = pdk.Layer(
        "ScatterplotLayer",
        data=df,
        get_position=[OLNG, OLAT],
        get_radius=180,
        get_fill_color=[0, 220, 255, 240],      
        stroked=True,
        get_line_color=[255, 255, 255, 160],
        line_width_min_pixels=1,
        pickable=False,
    )

    destinations = pdk.Layer(
        "ScatterplotLayer",
        data=df,
        get_position=[DLNG, DLAT],
        get_radius=180,
        get_fill_color=[255, 45, 45, 240],      
        stroked=True,
        get_line_color=[255, 255, 255, 160],
        line_width_min_pixels=1,
        pickable=False,
    )

    layers = [
        heatmap,
        g_clear, g_moderate, g_heavy,   
        l_clear, l_moderate, l_heavy,   
        origins, destinations,
    ]
    layers = [lyr for lyr in layers if lyr is not None]

    deck = pdk.Deck(
        layers=layers,
        initial_view_state=pdk.ViewState(
            latitude=19.0760, longitude=72.8777,
            zoom=11, pitch=45, bearing=0, 
        ),
        map_style="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        tooltip={
            "html": (
                "<div style='font-family:Share Tech Mono,monospace;font-size:11px;"
                "background:#0a0f1e;border:1px solid rgba(0,255,170,0.25);"
                "padding:10px 14px;border-radius:8px;color:#e2e8f0;line-height:2'>"
                "📍 <span style='color:#00dcff'>Origin</span><br>"
                "<b>{start_station}</b><br>"
                "🎯 <span style='color:#ff2d2d'>Destination</span><br>"
                "<b>{end_station}</b><br>"
                "🚦 Status: {_status}"
                "</div>"
            ),
            "style": {"background": "transparent", "border": "none"},
        },
    )

    st.markdown("""
        <div class="legend-row">
            <span><span class="legend-dot" style="background:#00dcff"></span>Clear (Cyan)</span>
            <span><span class="legend-dot" style="background:#ffbe00"></span>Moderate (Amber)</span>
            <span><span class="legend-dot" style="background:#ff2d2d"></span>Heavy (Red)</span>
            &nbsp;·&nbsp;
            <span><span class="legend-dot" style="background:#00dcff;outline:2px solid #fff;outline-offset:1px"></span>Origin</span>
            <span><span class="legend-dot" style="background:#ff2d2d;outline:2px solid #fff;outline-offset:1px"></span>Destination</span>
        </div>
    """, unsafe_allow_html=True)

    st.markdown('<div class="map-wrapper">', unsafe_allow_html=True)
    st.pydeck_chart(deck, use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# CHART + TABLE
# ══════════════════════════════════════════════════════════════════════════════
if not df.empty:
    st.markdown("---")
    col_chart, col_table = st.columns([3, 2], gap="large")

    with col_chart:
        st.markdown("### Traffic Activity Over Time")

        traffic_counts = (
            df.reset_index(drop=True)
            .assign(Interval=lambda x: x.index // 10)
            .groupby("Interval")
            .size()
            .reset_index(name="Events")
        )

        fig = go.Figure()

        fig.add_trace(go.Scatter(
            x=traffic_counts["Interval"],
            y=traffic_counts["Events"],
            mode="lines",
            line=dict(color="#00cfff", width=2.5, shape="spline", smoothing=1.2),
            fill="tozeroy",
            fillcolor="rgba(0,207,255,0.10)",
            name="Events",
            hovertemplate="<b>Interval %{x}</b><br>Events: %{y}<extra></extra>",
        ))

        fig.add_trace(go.Scatter(
            x=traffic_counts["Interval"],
            y=traffic_counts["Events"],
            mode="markers",
            marker=dict(
                color="#ff2d2d",
                size=5,
                opacity=0.8,
                line=dict(color="#ff8080", width=1),
            ),
            name="Peak",
            hoverinfo="skip",
            showlegend=False,
        ))

        fig.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            margin=dict(l=10, r=10, t=10, b=10),
            height=270,
            showlegend=False,
            xaxis=dict(
                showgrid=True,
                gridcolor="rgba(255,255,255,0.04)",
                tickfont=dict(family="Share Tech Mono", size=10, color="#475569"),
                zeroline=False, showline=False, title=None,
            ),
            yaxis=dict(
                showgrid=True,
                gridcolor="rgba(255,255,255,0.04)",
                tickfont=dict(family="Share Tech Mono", size=10, color="#475569"),
                zeroline=False, showline=False, title=None,
            ),
            hoverlabel=dict(
                bgcolor="#0a0f1e",
                bordercolor="#00cfff",
                font=dict(family="Share Tech Mono", size=11, color="#00cfff"),
            ),
        )
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    with col_table:
        st.markdown("### Recent Trips")
        show_cols = [c for c in ["start_station", "end_station", "mode", "total_fare", "_status"] if c in df.columns]
        rename_map = {
            "start_station": "Origin",
            "end_station": "Destination",
            "mode": "Mode",
            "total_fare": "Fare (₹)",
            "_status": "Status",
        }
        st.dataframe(
            df[show_cols].rename(columns=rename_map).tail(12).reset_index(drop=True),
            use_container_width=True,
            height=290,
        )

# ══════════════════════════════════════════════════════════════════════════════
# EMERGENCY RESET & AUTO-REFRESH (Moved to bottom)
# ══════════════════════════════════════════════════════════════════════════════
st.markdown("---")
st.markdown("<div style='margin-bottom: 20px;'></div>", unsafe_allow_html=True)

# Using columns to center the Emergency Reset button nicely at the bottom
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

# The actual looping logic
if live_mode:
    time.sleep(refresh_rate)
    st.rerun()