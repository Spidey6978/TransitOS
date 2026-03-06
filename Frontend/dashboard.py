import streamlit as st
import pandas as pd
import requests
import pydeck as pdk
import time
import random
from datetime import datetime

# --- CONFIG & THEME ---
st.set_page_config(page_title="TransitOS Command", layout="wide", page_icon="🚄")
API_URL = "http://localhost:8000"

st.markdown("""
    <style>
    .stApp { background-color: #050505; }
    h1 { color: #00f2ff !important; text-shadow: 0px 0px 10px #00f2ff; }
    div[data-testid="stMetricValue"] { color: #00f2ff; font-family: 'Courier New'; }
    .stButton>button { border: 1px solid #00f2ff; color: #00f2ff; background: transparent; }
    .stButton>button:hover { background: #00f2ff; color: black; }
    </style>
""", unsafe_allow_html=True)

# --- HELPERS ---
INDIAN_NAMES = ["Aarav Patel", "Rohan Sharma", "Ananya Gupta", "Vikram Singh", "Priya Desai", "Rahul Mehta", "Sneha Iyer", "Aditya Joshi"]
MODES = ["Local Train (Western)", "Local Train (Central)", "Metro Line 1", "BEST Bus (AC)", "Monorail", "Ferry / Water Taxi", "Uber/Auto"]

def generate_random_traffic(stations):
    if not stations: return
    
    start = random.choice(stations)
    end = random.choice(stations)
    while start == end: end = random.choice(stations)
    
    payload = {
        "commuter_name": random.choice(INDIAN_NAMES),
        "from_station": start,
        "to_station": end,
        "mode": random.choice(MODES)
    }
    try:
        requests.post(f"{API_URL}/book_ticket", json=payload)
    except:
        pass

# --- UI LAYOUT ---
col_logo, col_title, col_ctrl = st.columns([1, 4, 2])
with col_title:
    st.title("TransitOS: Traffic Mesh")

# --- CONTROL CENTER (Top Right) ---
with col_ctrl:
    st.markdown("### System Control")
    sim_mode = st.toggle("⚡ LIVE SIMULATION", value=False)
    if st.button("🗑️ RESET SYSTEM"):
        requests.post(f"{API_URL}/reset_db")
        st.rerun()

# --- SIDEBAR (Manual Entry) ---
st.sidebar.header("🎫 Manual Booking")
try:
    stations = requests.get(f"{API_URL}/stations").json()
except:
    stations = []

with st.sidebar.form("ticket_counter"):
    name = st.text_input("Passenger Name", "Riya Sen")
    c1, c2 = st.columns(2)
    s_from = c1.selectbox("From", stations, index=0)
    s_to = c2.selectbox("To", stations, index=5)
    mode = st.selectbox("Mode", MODES)
    
    if st.form_submit_button("Book Ticket"):
        payload = {"commuter_name": name, "from_station": s_from, "to_station": s_to, "mode": mode}
        requests.post(f"{API_URL}/book_ticket", json=payload)
        st.sidebar.success("Ticket Issued")

# --- DATA & SIMULATION LOOP ---
if sim_mode:
    # Generate 1-3 random trips per cycle
    for _ in range(random.randint(1, 3)):
        generate_random_traffic(stations)

# Fetch Data
try:
    data = requests.get(f"{API_URL}/ledger_live").json()
    df = pd.DataFrame(data)
except:
    df = pd.DataFrame()

# --- VISUALIZATION ---
if not df.empty:
    # 1. METRICS
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Total Commuters", len(df))
    m2.metric("Revenue (₹)", f"₹{df['total_fare'].sum():,.0f}")
    m3.metric("Avg Distance", f"{df['distance_km'].mean():.1f} km")
    m4.metric("Active Zones", df['start_station'].nunique())

    # 2. TRAFFIC DENSITY CALCULATION (Green -> Red)
    # Count trips between same Start-End pair
    route_counts = df.groupby(['start_station', 'end_station']).size().reset_index(name='count')
    
    # Merge coords back to route_counts for mapping
    # (This is a simplified approach to get colors)
    df['color_r'] = 0
    df['color_g'] = 255
    df['color_b'] = 200 # Default Cyan-ish
    
    # Logic: If many people take this route, turn RED
    def get_traffic_color(row):
        # Find count for this specific route
        count = len(df[(df['start_station'] == row['start_station']) & (df['end_station'] == row['end_station'])])
        if count > 10: return [255, 0, 0, 200]   # RED (High Traffic)
        if count > 3: return [255, 165, 0, 180]  # ORANGE (Med Traffic)
        return [0, 255, 255, 140]                # CYAN (Low Traffic)

    df['color'] = df.apply(get_traffic_color, axis=1)

    # 3. 3D MAP (ARCS & HEXAGONS)
    st.markdown("### 🌐 Real-time Mobility Mesh")
    
    view_state = pdk.ViewState(
        longitude=72.85, latitude=19.05, zoom=10.5, pitch=50, bearing=0
    )

    # Layer 1: The Arcs (Flight paths)
    arc_layer = pdk.Layer(
        "ArcLayer",
        data=df,
        get_source_position=["start_lng", "start_lat"],
        get_target_position=["end_lng", "end_lat"],
        get_source_color="color",
        get_target_color="color",
        get_width=3,
        auto_highlight=True,
    )

    # Layer 2: Hexagons (Density at stations)
    hex_layer = pdk.Layer(
        "HexagonLayer",
        data=df,
        get_position=["start_lng", "start_lat"],
        radius=300,
        elevation_scale=40,
        elevation_range=[0, 2000],
        extruded=True,
        material={"ambient": 0.8, "diffuse": 0.8}
    )

    st.pydeck_chart(pdk.Deck(
        layers=[arc_layer, hex_layer],
        initial_view_state=view_state,
        tooltip={"text": "{start_station} -> {end_station}\n{commuter_name}"}
    ))

    # 4. LEDGER
    st.markdown("### 🧾 Blockchain Settlement Ledger")
    st.dataframe(
        df[['timestamp', 'commuter_name', 'start_station', 'end_station', 'mode', 'total_fare', 'operator_split']],
        use_container_width=True,
        hide_index=True
    )

else:
    st.info("System Ready. Toggle 'LIVE SIMULATION' to visualize Mumbai traffic.")

# Loop Logic
if sim_mode:
    time.sleep(1) # Fast updates
    st.rerun()
else:
    time.sleep(3) # Slow poll
    st.rerun()