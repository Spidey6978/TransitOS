# File Tree: TransitOS

**Root Path:** `c:\Users\peppy\OneDrive\Desktop\TransitOs\TransitOS`

├── 📁 Backend
│   ├── 🐍 __init__.py
│   ├── 🐍 main.py
│   ├── 🐍 models.py
│   ├── 🐍 mumbai_data.py
│   └── 🐍 web3_bridge.py
├── 📁 Frontend
│   └── 🐍 dashboard.py
├── 📁 Scripts
│   └── 🐍 simulate_traffic.py
├── ⚙️ .gitignore
├── 📄 commands.txt
├── 📝 readme.md
└── 📄 requirements.txt

# TransitOS — Backend (Dev 2) README

**Developer:** Dev 2 — Backend & Web3 Bridge  
**Sprint Status:** Phase 1 Complete ✅ | Phase 2 Pending (awaiting Dev 1 ABI)  
**Last Updated:** Day 3 of 14-Day Sprint

---

## ⚙️ Setup

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure environment variables
Create a `.env` file inside `Backend/`:
```
ALCHEMY_RPC_URL=your_alchemy_url_here
PRIVATE_KEY=your_metamask_private_key_here
CONTRACT_ADDRESS=your_contract_address_here
```
> These values stay as placeholders until Dev 1 hands over the ABI and contract address in Phase 2.

### 3. Run the server
```bash
cd Backend
python -m uvicorn main:app --reload
```

### 4. Open the interactive API docs
```
http://localhost:8000/docs
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/health` | Server + DB status check | ✅ Live |
| GET | `/stations` | Returns all 25 Mumbai transit stations | ✅ Live |
| POST | `/book_ticket` | Books a single ticket, saves to SQLite | ✅ Live |
| POST | `/sync_offline` | Syncs a batch of offline-queued tickets | ✅ Live |
| GET | `/ledger_live` | Full transaction ledger (used by Dev 4) | ✅ Live |
| GET | `/stats` | Summary stats for Dev 4's dashboard | ✅ Live |
| POST | `/reset_db` | Clears all data — demo use only | ✅ Live |

---

## 📋 Request / Response Schemas

### POST `/book_ticket`

**Request body:**
```json
{
  "commuter_name": "Rahul Sharma",
  "from_station": "Andheri",
  "to_station": "CST",
  "mode": "Local Train"
}
```

**Mode options:** `"Local Train"`, `"Metro"`, `"AC Metro"`, `"Hybrid"`, `"Ferry"`

**Response:**
```json
{
  "status": "success",
  "tx_hash": "0x4a7f2c1d...",
  "fare": 47.50,
  "split": "Railways: ₹45.1 | TransitOS: ₹2.4",
  "from_station": "Andheri",
  "to_station": "CST",
  "distance_km": 18.3
}
```

---

### POST `/sync_offline`

**Request body:**
```json
{
  "tickets": [
    {"commuter_name": "Priya", "from_station": "Bandra", "to_station": "Dadar (Western)", "mode": "Local Train"},
    {"commuter_name": "Amit",  "from_station": "Kurla",  "to_station": "Thane",           "mode": "Metro"}
  ]
}
```

**Response:**
```json
{
  "status": "queued",
  "total_received": 2,
  "results": [
    {"commuter": "Priya", "tx_hash": "0x...", "status": "saved"},
    {"commuter": "Amit",  "tx_hash": "0x...", "status": "saved"}
  ]
}
```

---

## 🗄️ Database Schema

**Table: `ledger`** (SQLite — `transitos.db`)

| Column | Type | Description |
|--------|------|-------------|
| `hash` | TEXT (PK) | SHA256 mock hash (Phase 1) → real tx hash (Phase 2) |
| `timestamp` | DATETIME | Time of booking |
| `commuter_name` | TEXT | Passenger name |
| `start_station` | TEXT | Departure station |
| `end_station` | TEXT | Arrival station |
| `mode` | TEXT | Transit mode |
| `distance_km` | REAL | Calculated via Haversine formula |
| `total_fare` | REAL | Base ₹10 + ₹2/km (×1.5 for AC) |
| `operator_split` | TEXT | Revenue split string |
| `start_lat/lng` | REAL | Departure coordinates |
| `end_lat/lng` | REAL | Arrival coordinates |

---

## 💰 Fare & Revenue Split Logic

| Mode | Fare Calculation | Split |
|------|-----------------|-------|
| Local Train | ₹10 + ₹2/km | Railways 95% / TransitOS 5% |
| Metro | ₹10 + ₹2/km | MMRDA 90% / TransitOS 10% |
| AC Metro | (₹10 + ₹2/km) × 1.5 | MMRDA 90% / TransitOS 10% |
| Hybrid | ₹10 + ₹2/km | Railways 50% / BEST 40% / TransitOS 10% |
| Ferry | ₹10 + ₹2/km | Operator 95% / TransitOS 5% |

---

## 📦 Dependencies (`requirements.txt`)

fastapi
uvicorn
streamlit
pandas
requests
pydeck
pydantic
watchdog
python-dotenv
web3
sqlalchemy

---

## 🔄 Phase Progress

### ✅ Phase 1 — Complete (Days 1–3)
- [x] FastAPI project initialized
- [x] SQLite `ledger` table created and working
- [x] `models.py` created — shared schema for Dev 3 & Dev 4
- [x] `TicketRequest`, `OfflineSyncPayload`, `TicketResponse`, `SyncResponse` models defined
- [x] `/book_ticket` returns full `TicketResponse` with fare, split, distance
- [x] `/sync_offline` added — handles batches, uses `INSERT OR IGNORE` to prevent duplicates
- [x] `/stats`, `/health`, `/ledger_live`, `/stations`, `/reset_db` all tested
- [x] `.env` and `.gitignore` configured
- [x] `web3_bridge.py` stub created — ready for Phase 2
- [x] JSON schema shared with Dev 3 and Dev 4

### ⏳ Phase 2 — Pending (Days 4–6)
- [ ] **Blocked:** Waiting for Dev 1 to hand over `ABI.json` + `CONTRACT_ADDRESS`
- [ ] Install `web3.py`, configure Alchemy RPC
- [ ] Fill in `web3_bridge.py` with real `settle_fare()` logic
- [ ] Replace SHA256 mock hashes in `/book_ticket` and `/sync_offline` with real blockchain transactions

### ⏳ Phase 3 — Not Started (Days 7–9)
- [ ] DB rollbacks if Web3 transaction fails
- [ ] `status` column tracking: `pending` → `confirmed` / `failed`

### ⏳ Phase 4 — Not Started (Days 10–14)
- [ ] Rate limiting on `/book_ticket` (slowapi)
- [ ] Deploy to Render
- [ ] Clean up `.env`, ensure no secrets in git history

---

## 🔗 Dev Handoff Notes

| Team Member | What they need from Dev 2 | Status |
|---|---|---|
| **Dev 3 (Frontend)** | JSON schema from `models.py` + live localhost URL | ✅ Shared |
| **Dev 4 (Dashboard)** | `/ledger_live` and `/stats` endpoints returning data | ✅ Live |
| **Dev 1 (Web3)** | Nothing — waiting on their `ABI.json` and contract address | ⏳ Pending |

---

## ⚠️ Important Notes

- **Never commit `.env`** — it contains your Metamask private key
- **`transitos.db` is local only** — it's in `.gitignore`, each dev runs their own instance
- **`INSERT OR IGNORE`** in `/sync_offline` prevents duplicate tickets if a user retries an offline sync
- The `web3_bridge.py` currently returns stub hashes — this is intentional until Phase 2

### ✅ Phase 2 — Complete (Days 4–6)
- [x] web3.py installed and configured
- [x] Alchemy RPC URL connected to Polygon Amoy
- [x] web3_bridge.py filled with real settle_trip() logic
- [x] Real blockchain transactions working and verified on Polygonscan

### ✅ Phase 3 — Complete (Days 7–9)
- [x] /sync_offline tested with real batch — 3 tickets, 3 real tx hashes
- [x] status column added to ledger table
- [x] DB rollbacks working — failed Web3 tx never writes to SQLite

### ⏳ Phase 4 — In Progress (Days 10–14)
- [x] RPC calls optimized with timeout
- [x] /stats shows on-chain revenue
- [ ] Deploy to Render