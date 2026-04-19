import { useState, useEffect, useRef, useCallback } from "react";
// Import the centralized API config with Ngrok headers
import api from "../../service/api"; 

// ─── Constants ────────────────────────────────────────────────────────────────
const INDIAN_NAMES = [
  "Aarav Patel","Rohan Sharma","Ananya Gupta","Vikram Singh","Priya Desai",
  "Rahul Mehta","Sneha Iyer","Aditya Joshi","Kavya Nair","Arjun Reddy",
  "Meera Pillai","Karan Malhotra","Divya Rao","Nikhil Jain","Pooja Verma",
];
const MODES = ["Local Train","Metro","AC Metro","Hybrid","Ferry"];
const MODE_COLORS = {
  "Local Train": "#0EA5E9",
  "Metro":       "#22D3EE",
  "AC Metro":    "#818CF8",
  "Hybrid":      "#F59E0B",
  "Ferry":       "#34D399",
};
const MOCK_STATIONS = [
  "Churchgate","Marine Lines","Charni Road","Grant Road","Mumbai Central",
  "Mahalaxmi","Lower Parel","Prabhadevi","Dadar (Western)","Matunga Road",
  "Mahim","Bandra","Khar Road","Santacruz","Vile Parle","Andheri","Jogeshwari",
  "Goregaon","Malad","Kandivali","Borivali","Dahisar","CST","Kurla","Thane",
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randFloat(min, max) { return +(min + Math.random() * (max - min)).toFixed(2); }

function generateMockTicket(id) {
  const from = rand(MOCK_STATIONS);
  const to   = rand(MOCK_STATIONS.filter(s => s !== from));
  const mode = rand(MODES);
  const dist = randFloat(2, 35);
  let fare = 10 + 2 * dist;
  if (mode === "AC Metro") fare *= 1.5;
  fare = +fare.toFixed(2);
  const splits = {
    "Local Train": `Railways: ₹${+(fare*0.95).toFixed(2)} | TransitDost: ₹${+(fare*0.05).toFixed(2)}`,
    "Metro":       `MMRDA: ₹${+(fare*0.90).toFixed(2)} | TransitDost: ₹${+(fare*0.10).toFixed(2)}`,
    "AC Metro":    `MMRDA: ₹${+(fare*0.90).toFixed(2)} | TransitDost: ₹${+(fare*0.10).toFixed(2)}`,
    "Hybrid":      `Railways: ₹${+(fare*0.50).toFixed(2)} | BEST: ₹${+(fare*0.40).toFixed(2)} | TransitDost: ₹${+(fare*0.10).toFixed(2)}`,
    "Ferry":       `Operator: ₹${+(fare*0.95).toFixed(2)} | TransitDost: ₹${+(fare*0.05).toFixed(2)}`,
  };
  return {
    hash: `0x${Math.random().toString(16).slice(2,12)}...`,
    timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    commuter_name: rand(INDIAN_NAMES),
    start_station: from,
    end_station: to,
    mode,
    distance_km: dist,
    total_fare: fare,
    operator_split: splits[mode],
    id,
  };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "#22D3EE" }) {
  return (
    <div style={{
      background: "#0D1B2E", border: "1px solid #1E3A5F",
      borderRadius: 12, padding: "16px 20px",
      display: "flex", flexDirection: "column", gap: 4,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.7 }}/>
      <span style={{ fontSize: 11, color: "#4A7FA5", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'Courier New', monospace" }}>
        {label}
      </span>
      <span style={{ fontSize: 26, fontWeight: 700, color, fontFamily: "'Courier New', monospace", lineHeight: 1.1 }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: 11, color: "#4A7FA5" }}>{sub}</span>}
    </div>
  );
}

// ─── Mode Badge ───────────────────────────────────────────────────────────────
function ModeBadge({ mode }) {
  const color = MODE_COLORS[mode] || "#22D3EE";
  return (
    <span style={{
      fontSize: 10, padding: "2px 8px", borderRadius: 4,
      border: `1px solid ${color}40`, color, background: `${color}15`,
      fontFamily: "'Courier New', monospace", letterSpacing: "0.05em",
      whiteSpace: "nowrap",
    }}>
      {mode}
    </span>
  );
}

// ─── Ledger Row ───────────────────────────────────────────────────────────────
const tdStyle = {
  padding: "8px 12px",
  fontSize: 12,
  color: "#CBD5E1",
  borderBottom: "1px solid #1E3A5F",
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "break-word",
};

function LedgerRow({ ticket, index }) {
  return (
    <tr style={{ background: index % 2 === 0 ? "transparent" : "#0A1628" }}>
      <td style={tdStyle}><span style={{ color: "#22D3EE", fontFamily: "monospace", fontSize: 11 }}>{ticket.hash.slice(0, 14)}…</span></td>
      <td style={tdStyle}>{ticket.commuter_name}</td>
      <td style={tdStyle}>
        <span style={{ color: "#94A3B8", fontSize: 11 }}>{ticket.start_station}</span>
        {" → "}
        <span style={{ color: "#94A3B8", fontSize: 11 }}>{ticket.end_station}</span>
      </td>
      <td style={{ ...tdStyle, color: "#4ADE80", fontFamily: "monospace" }}>₹{ticket.total_fare}</td>
      <td style={{ ...tdStyle, color: "#4A7FA5", fontSize: 11, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "break-word" }}>{ticket.operator_split}</td>
    </tr>
  );
}

// ─── Mode Distribution ────────────────────────────────────────────────────────
function ModeDistribution({ tickets }) {
  const counts = {};
  tickets.forEach(t => { counts[t.mode] = (counts[t.mode] || 0) + 1; });
  const total = tickets.length || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([mode, count]) => {
        const pct = Math.round((count / total) * 100);
        const color = MODE_COLORS[mode] || "#22D3EE";
        return (
          <div key={mode} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 90, fontSize: 11, color: "#94A3B8", textAlign: "right", fontFamily: "monospace", flexShrink: 0 }}>{mode}</span>
            <div style={{ flex: 1, height: 16, background: "#0D1B2E", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: color, opacity: 0.85, borderRadius: 4, transition: "width 0.6s ease" }}/>
            </div>
            <span style={{ width: 38, fontSize: 11, color, fontFamily: "monospace", textAlign: "right" }}>{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Revenue Timeline ─────────────────────────────────────────────────────────
function RevenueTimeline({ tickets }) {
  const buckets = {};
  tickets.forEach(t => {
    const dt = new Date(t.timestamp);
    const key = `${dt.getHours()}:${String(dt.getMinutes()).padStart(2,"0")}`;
    buckets[key] = (buckets[key] || 0) + t.total_fare;
  });
  const entries = Object.entries(buckets).slice(-12);
  if (entries.length < 2) return (
    <div style={{ color: "#4A7FA5", fontSize: 12, padding: "20px 0", textAlign: "center" }}>Accumulating data…</div>
  );
  const W = 340, H = 80;
  const maxVal = Math.max(...entries.map(e => e[1]));
  const area = `M 0,${H} L ${entries.map(([, v], i) => `${(i/(entries.length-1))*W},${H-(v/maxVal)*H*0.9-4}`).join(" L ")} L ${W},${H} Z`;
  const pts  = entries.map(([, v], i) => `${(i/(entries.length-1))*W},${H-(v/maxVal)*H*0.9-4}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 80 }}>
      <defs>
        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill="url(#revGrad)"/>
      <polyline points={pts} fill="none" stroke="#22D3EE" strokeWidth="1.5"/>
      {entries.map(([, v], i) => (
        <circle key={i} cx={(i/(entries.length-1))*W} cy={H-(v/maxVal)*H*0.9-4} r="2.5" fill="#22D3EE"/>
      ))}
    </svg>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function TransitOSDashboard() {
  const [tickets, setTickets]     = useState([]);
  const [simMode, setSimMode]     = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [lastSync, setLastSync]   = useState(null);
  const ticketIdRef               = useRef(0);
  const intervalRef               = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      // Use our centralized api instance with bypass headers
      const res = await api.get("/ledger_live");
      if (res.status === 200) {
        setTickets(res.data);
        setApiOnline(true);
        setLastSync(new Date());
        return;
      }
    } catch (err) {
      console.error("Dashboard Connection Error", err);
    }
    setApiOnline(false);
  }, []);

  const addMockTicket = useCallback(() => {
    ticketIdRef.current += 1;
    setTickets(prev => [...prev, generateMockTicket(ticketIdRef.current)].slice(-200));
    setLastSync(new Date());
  }, []);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (simMode) {
      // If API is online, poll the backend. If offline, simulate locally.
      intervalRef.current = apiOnline
        ? setInterval(fetchData, 2000)
        : setInterval(() => {
            const count = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < count; i++) addMockTicket();
          }, 1200);
    }
    return () => clearInterval(intervalRef.current);
  }, [simMode, apiOnline, fetchData, addMockTicket]);

  const handleReset = async () => {
    try { await api.post("/reset_db"); } catch {}
    setTickets([]);
    ticketIdRef.current = 0;
  };

  const totalRevenue = tickets.reduce((s, t) => s + (t.total_fare || 0), 0);
  const avgDist      = tickets.length ? tickets.reduce((s, t) => s + (t.distance_km || 0), 0) / tickets.length : 0;
  const activeZones  = new Set(tickets.map(t => t.start_station)).size;

  const routeMap = {};
  tickets.forEach(t => {
    const k = `${t.start_station} → ${t.end_station}`;
    routeMap[k] = (routeMap[k] || 0) + 1;
  });
  const topRoutes = Object.entries(routeMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", color: "#E2E8F0", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{
        background: "#080E1A", borderBottom: "1px solid #1E3A5F",
        padding: "0 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 52,
      }}>
        <span style={{ fontSize: 11, color: "#4A7FA5", letterSpacing: "0.15em", fontFamily: "'Courier New', monospace" }}>
          MOBILITY KERNEL
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {apiOnline && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#4ADE80" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80", boxShadow: "0 0 6px #4ADE80" }}/>
              API LIVE
            </div>
          )}
          {lastSync && (
            <span style={{ fontSize: 10, color: "#4A7FA5", fontFamily: "monospace" }}>
              SYNC {lastSync.toLocaleTimeString("en-IN")}
            </span>
          )}
          <button
            onClick={() => setSimMode(s => !s)}
            style={{
              padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              border: `1px solid ${simMode ? "#F43F5E" : "#0EA5E9"}`,
              background: simMode ? "#F43F5E18" : "#0EA5E918",
              color: simMode ? "#F43F5E" : "#0EA5E9",
              cursor: "pointer", letterSpacing: "0.08em",
              fontFamily: "'Courier New', monospace", transition: "all 0.2s",
            }}
          >
            {simMode ? "⬛ STOP SIM" : "▶ LIVE SIM"}
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: "6px 12px", borderRadius: 6, fontSize: 11,
              border: "1px solid #F43F5E40", background: "#F43F5E12",
              color: "#F43F5E", cursor: "pointer", letterSpacing: "0.08em",
              fontFamily: "'Courier New', monospace",
            }}
          >
            ⚠ RESET
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ padding: "20px 24px 0", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <StatCard label="Total Commuters" value={tickets.length.toLocaleString("en-IN")} sub="Active sessions"    color="#0EA5E9"/>
        <StatCard label="Revenue (₹)"     value={`₹${Math.round(totalRevenue).toLocaleString("en-IN")}`} sub="Blockchain settled" color="#4ADE80"/>
        <StatCard label="Avg Distance"    value={`${avgDist.toFixed(1)} km`}              sub="Haversine calc"    color="#22D3EE"/>
        <StatCard label="Active Zones"    value={activeZones}                              sub="Unique origins"   color="#818CF8"/>
      </div>

      {/* ── Main Content ── */}
      <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>

        {/* LEFT: Ledger */}
        <div style={{ background: "#080E1A", border: "1px solid #1E3A5F", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #1E3A5F" }}>
            <span style={{ fontSize: 11, color: "#4A7FA5", letterSpacing: "0.12em", fontFamily: "monospace" }}>
              BLOCKCHAIN SETTLEMENT LEDGER
            </span>
          </div>
          <div style={{ overflowX: "auto", maxHeight: 520, overflowY: "auto" }}>
            {tickets.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", color: "#4A7FA5", fontSize: 13 }}>
                No transactions yet — toggle LIVE SIM or check backend connection
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed", wordBreak: "break-word" }}>
                <colgroup>
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "33%" }} />
                </colgroup>
                <thead>
                  <tr style={{ background: "#0A1628" }}>
                    {["TX HASH","COMMUTER","ROUTE","FARE","SPLIT"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: "#4A7FA5", letterSpacing: "0.1em", fontWeight: 600, borderBottom: "1px solid #1E3A5F", whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "break-word" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...tickets].reverse().slice(0, 100).map((t, i) => (
                    <LedgerRow key={t.id || t.hash} ticket={t} index={i} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT: Panels */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Revenue timeline */}
          <div style={{ background: "#080E1A", border: "1px solid #1E3A5F", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #1E3A5F" }}>
              <span style={{ fontSize: 10, color: "#4A7FA5", letterSpacing: "0.12em", fontFamily: "monospace" }}>REVENUE TIMELINE</span>
            </div>
            <div style={{ padding: "10px 14px" }}>
              <RevenueTimeline tickets={tickets} />
            </div>
          </div>

          {/* Mode distribution */}
          <div style={{ background: "#080E1A", border: "1px solid #1E3A5F", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #1E3A5F" }}>
              <span style={{ fontSize: 10, color: "#4A7FA5", letterSpacing: "0.12em", fontFamily: "monospace" }}>MODE DISTRIBUTION</span>
            </div>
            <div style={{ padding: "12px 14px" }}>
              {tickets.length === 0
                ? <div style={{ color: "#2D4A6B", fontSize: 12, textAlign: "center", padding: "10px 0" }}>No data</div>
                : <ModeDistribution tickets={tickets} />
              }
            </div>
          </div>

          {/* Top routes */}
          <div style={{ background: "#080E1A", border: "1px solid #1E3A5F", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #1E3A5F" }}>
              <span style={{ fontSize: 10, color: "#4A7FA5", letterSpacing: "0.12em", fontFamily: "monospace" }}>HIGH TRAFFIC ROUTES</span>
            </div>
            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {topRoutes.length === 0
                ? <div style={{ color: "#2D4A6B", fontSize: 12, textAlign: "center", padding: "10px 0" }}>No data</div>
                : topRoutes.map(([route, count], i) => (
                  <div key={route} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      background: i === 0 ? "#F43F5E20" : "#0EA5E915",
                      border: `1px solid ${i === 0 ? "#F43F5E40" : "#0EA5E930"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, color: i === 0 ? "#F43F5E" : "#0EA5E9", fontWeight: 700,
                    }}>
                      {i+1}
                    </span>
                    <span style={{ flex: 1, fontSize: 11, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {route}
                    </span>
                    <span style={{ fontSize: 11, color: i === 0 ? "#F43F5E" : "#4A7FA5", fontFamily: "monospace" }}>
                      {count}x
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}