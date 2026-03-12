import streamlit as st
import sqlite3
import pandas as pd
import pydeck as pdk
import plotly.graph_objects as go
import time

st.set_page_config(
    page_title="TransitOS",
    page_icon="🚦",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600&display=swap');

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
[data-testid="stSidebar"] {
    background: linear-gradient(180deg,#0a0f1e 0%,#060d1a 100%) !important;
    border-right: 1px solid rgba(0,255,170,0.15) !important;
}
[data-testid="stSidebar"] * { color: #94a3b8 !important; }
[data-testid="stSidebar"] h2, [data-testid="stSidebar"] h3 {
    color: #00ffaa !important;
    font-family: 'Rajdhani', sans-serif !important;
    letter-spacing: 0.1em;
}
.main .block-container {
    padding: 2rem 2.5rem !important;
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
.status-badge { display: inline-flex; align-items: center; gap: 6px; font-family: 'Share Tech Mono', monospace; font-size: 0.7rem; letter-spacing: 0.15em; color: #00ffaa; text-transform: uppercase; }
.pulse-dot { width: 8px; height: 8px; background: #00ffaa; border-radius: 50%; animation: pulse-ring 1.8s ease-out infinite; display: inline-block; }
@keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(0,255,170,0.5); }
    70%  { box-shadow: 0 0 0 8px rgba(0,255,170,0); }
    100% { box-shadow: 0 0 0 0 rgba(0,255,170,0); }
}
.stat-card { background: linear-gradient(135deg,rgba(0,255,170,0.03),rgba(0,207,255,0.05)); border: 1px solid rgba(0,207,255,0.15); border-radius: 10px; padding: 0.9rem 1.1rem; margin-bottom: 0.6rem; }
.stat-card-label { font-family: 'Share Tech Mono', monospace; font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; color: #475569; margin-bottom: 0.15rem; }
.stat-card-value { font-family: 'Rajdhani', sans-serif; font-size: 1.5rem; font-weight: 700; color: #00cfff; }
</style>
""", unsafe_allow_html=True)

# ── database ───────────────────────────────────────────────────────────────────
@st.cache_resource
def get_connection():
    return sqlite3.connect("traffic.db", check_same_thread=False)

conn = get_connection()

@st.cache_data(ttl=2)
def load_data():
    try:
        df = pd.read_sql_query("SELECT * FROM traffic", conn)
        # FIX: Use simple snake_case column names — spaces in names break PyDeck accessors
        df = df.rename(columns={
            "start_lat": "olat",
            "start_lon": "olng",
            "end_lat":   "dlat",
            "end_lon":   "dlng",
        })
        return df
    except Exception:
        return pd.DataFrame()

df = load_data()

# Short alias constants matching renamed columns
OLAT = "olat"
OLNG = "olng"
DLAT = "dlat"
DLNG = "dlng"

# ── stats ──────────────────────────────────────────────────────────────────────
total_events   = len(df)
active_origins = df[[OLAT, OLNG]].drop_duplicates().shape[0] if not df.empty else 0
unique_dest    = df[[DLAT, DLNG]].drop_duplicates().shape[0] if not df.empty else 0
congestion_pct = min(int((1 - active_origins / max(total_events, 1)) * 100), 99) if total_events > 0 else 0

# ══════════════════════════════════════════════════════════════════════════════
# SIDEBAR
# ══════════════════════════════════════════════════════════════════════════════
with st.sidebar:
    st.markdown("## ⚡ TransitOS")
    st.markdown('<div class="status-badge"><span class="pulse-dot"></span>Live Monitoring</div>', unsafe_allow_html=True)
    st.markdown("---")
    st.metric("Total Events",   f"{total_events:,}")
    st.metric("Active Origins", f"{active_origins:,}")
    st.metric("Destinations",   f"{unique_dest:,}")
    st.markdown("---")
    st.markdown(f"""
        <div class="stat-card">
            <div class="stat-card-label">Network Load</div>
            <div class="stat-card-value">{congestion_pct}%</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-label">City</div>
            <div class="stat-card-value" style="font-size:1.1rem;color:#e2e8f0">Mumbai, IN</div>
        </div>
    """, unsafe_allow_html=True)
    st.markdown("---")
    st.markdown('<p style="font-family:\'Share Tech Mono\',monospace;font-size:0.65rem;letter-spacing:0.15em;color:#334155;text-transform:uppercase;">TransitOS v2.4 · Real-time</p>', unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# HEADER + KPIs
# ══════════════════════════════════════════════════════════════════════════════
st.markdown(
    '<div class="dashboard-title">🚦 TransitOS Smart Traffic</div>'
    '<div class="dashboard-subtitle">Real-Time Urban Mobility Intelligence · Mumbai Metropolitan Region</div>',
    unsafe_allow_html=True,
)

c1, c2, c3, c4 = st.columns(4)
c1.metric("Total Events",        f"{total_events:,}",   delta="Live")
c2.metric("Active Origins",      f"{active_origins:,}", delta=f"+{active_origins} nodes")
c3.metric("Unique Destinations", f"{unique_dest:,}")
c4.metric("Network Load",        f"{congestion_pct}%",  delta="Nominal" if congestion_pct < 80 else "High")

st.markdown("---")

# ══════════════════════════════════════════════════════════════════════════════
# MAP
# ══════════════════════════════════════════════════════════════════════════════
if df.empty:
    st.warning("⚠ No traffic data detected. Start the simulator to populate the feed.")
else:
    st.markdown("### Live Traffic Map")

    # ── classify each route by frequency (frequency = congestion proxy) ────────
    route_keys = [OLAT, OLNG, DLAT, DLNG]
    df["_count"] = df.groupby(route_keys)[OLAT].transform("count")
    low_t  = df["_count"].quantile(0.40)
    high_t = df["_count"].quantile(0.75)

    df["_status"] = df["_count"].apply(
        lambda c: "Clear" if c <= low_t else ("Moderate" if c <= high_t else "Heavy")
    )

    # ── split into 3 subsets — one LineLayer per colour ────────────────────────
    # FIX: Per-row color columns in pydeck are unreliable; use separate layers per color
    df_clear    = df[df["_status"] == "Clear"].copy()
    df_moderate = df[df["_status"] == "Moderate"].copy()
    df_heavy    = df[df["_status"] == "Heavy"].copy()

    # FIX: Pass color as a plain 4-element list — NOT as a concatenated variable.
    # PyDeck serialises layer kwargs directly; list literals are safe.
    def make_line_layers(data, r, g, b):
        """Return (glow_layer, line_layer) for a data subset; (None, None) if empty."""
        if data is None or data.empty:
            return None, None
        glow = pdk.Layer(
            "LineLayer",
            data=data,
            get_source_position=[OLNG, OLAT],   # FIX: simple col names, no spaces
            get_target_position=[DLNG, DLAT],
            get_color=[r, g, b, 55],            # FIX: inline literal list — always 4 ints
            get_width=18,
            pickable=False,
        )
        line = pdk.Layer(
            "LineLayer",
            data=data,
            get_source_position=[OLNG, OLAT],
            get_target_position=[DLNG, DLAT],
            get_color=[r, g, b, 230],           # FIX: inline literal list
            get_width=4,
            pickable=True,
            auto_highlight=True,
            highlight_color=[255, 255, 255, 220],
        )
        return glow, line

    # Vivid cyan / amber / red palette
    g_clear,    l_clear    = make_line_layers(df_clear,    0,   220, 255)   # cyan
    g_moderate, l_moderate = make_line_layers(df_moderate, 255, 190, 0)    # amber
    g_heavy,    l_heavy    = make_line_layers(df_heavy,    255, 45,  45)    # red

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
        get_fill_color=[0, 220, 255, 240],      # cyan dots for origins
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
        get_fill_color=[255, 45, 45, 240],      # red dots for destinations
        stroked=True,
        get_line_color=[255, 255, 255, 160],
        line_width_min_pixels=1,
        pickable=False,
    )

    layers = [
        heatmap,
        g_clear, g_moderate, g_heavy,   # glow passes first (wider, translucent)
        l_clear, l_moderate, l_heavy,   # crisp lines on top
        origins, destinations,
    ]
    layers = [lyr for lyr in layers if lyr is not None]

    deck = pdk.Deck(
        layers=layers,
        initial_view_state=pdk.ViewState(
            latitude=19.0760, longitude=72.8777,
            zoom=11, pitch=0, bearing=0,
        ),
        # FIX: Use CARTO dark map style — works without a Mapbox token
        map_style="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        tooltip={
            "html": (
                "<div style='font-family:Share Tech Mono,monospace;font-size:11px;"
                "background:#0a0f1e;border:1px solid rgba(0,255,170,0.25);"
                "padding:10px 14px;border-radius:8px;color:#e2e8f0;line-height:2'>"
                "📍 <span style='color:#00dcff'>Origin</span><br>"
                "{olat}, {olng}<br>"
                "🎯 <span style='color:#ff2d2d'>Destination</span><br>"
                "{dlat}, {dlng}<br>"
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

        # FIX: Single trace with a visible line color — no hidden zero-width layer
        # Area fill below the line (cyan glow fill)
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

        # Second trace: glowing dot markers on top of the line (red accent dots)
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
        # FIX: Show display-friendly labels in the table without affecting internal column names
        show_cols = [c for c in [OLAT, OLNG, DLAT, DLNG, "_status"] if c in df.columns]
        rename_map = {
            OLAT: "Origin Lat",
            OLNG: "Origin Lng",
            DLAT: "Dest Lat",
            DLNG: "Dest Lng",
            "_status": "Traffic Status",
        }
        st.dataframe(
            df[show_cols].rename(columns=rename_map).tail(12).reset_index(drop=True),
            use_container_width=True,
            height=290,
        )
