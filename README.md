# TransitOS Backend — Dev 2 Documentation

**Project:** TransitOS — Blockchain-Based Mumbai Transit Fare Settlement System
**Role:** Dev 2 — FastAPI Backend & Web3 Bridge
**Stack:** Python · FastAPI · SQLite · web3.py · Alchemy · Polygon Amoy Testnet

---

## Final File Structure

```
TransitOS/
├── Backend/
│   ├── main.py            ← FastAPI routes (all endpoints)
│   ├── models.py          ← Pydantic schemas (shared contract with Dev 3 & Dev 4)
│   ├── mumbai_data.py     ← 25 Mumbai stations with coordinates (untouched)
│   ├── web3_bridge.py     ← Blockchain signing & transaction logic
│   ├── ABI.json           ← Smart contract interface (provided by Dev 1)
│   ├── __init__.py        ← Marks Backend as a Python package
│   ├── transitos.db       ← SQLite database (auto-created, never commit)
│   └── .env               ← Secrets file (NEVER commit)
├── Frontend/
│   └── dashboard.py       ← Dev 4's Streamlit dashboard
├── Scripts/
│   └── simulate_traffic.py ← Dev 4's traffic simulator
├── requirements.txt
├── render.yaml            ← Render deployment config
└── .gitignore
```

---

## Environment Setup

### Virtual Environment

```bash
# Activate (Windows)
.venv\Scripts\activate

# Install all dependencies
pip install -r requirements.txt
```

### Run the Backend

```bash
cd Backend
python -m uvicorn main:app --reload
```

Server starts at: `http://127.0.0.1:8000`
Interactive docs at: `http://127.0.0.1:8000/docs`

---

## Environment Variables (.env)

Create `Backend/.env` with these 3 values. **Never commit this file.**

```
ALCHEMY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your64characterhexkeyhere
CONTRACT_ADDRESS=0x099439A86624942d2A151e0C81B698BA1a197A72
```

| Variable | Source | Purpose |
|---|---|---|
| `ALCHEMY_RPC_URL` | alchemy.com (free account) | Internet connection to Polygon Amoy blockchain |
| `PRIVATE_KEY` | Metamask → Export Private Key | Signs every blockchain transaction |
| `CONTRACT_ADDRESS` | Dev 1 (already deployed) | Address of the TransitSettlement smart contract |

---

## API Endpoints

| Method | Endpoint | Description | Used By |
|---|---|---|---|
| GET | `/` | Root check | General |
| GET | `/health` | Connection status (DB + Web3) | Dev 3, Dev 4 |
| GET | `/stations` | List of 25 Mumbai stations | Dev 3 |
| POST | `/book_ticket` | Book a single ticket → real blockchain tx | Dev 3 |
| POST | `/sync_offline` | Sync batch of offline tickets → real blockchain txs | Dev 3 |
| GET | `/ledger_live` | All transactions from SQLite | Dev 4 |
| GET | `/stats` | Summary numbers + on-chain revenue | Dev 4 |
| POST | `/reset_db` | Clear all ledger data (demo use only) | Dev 4 |

---

## Phase Progress

### ✅ Phase 1 — Foundation (Days 1–3)

**Goal:** FastAPI running with clean schema that other devs can mock against immediately.

#### What Was Built

- FastAPI project initialized inside existing `Backend/` folder structure
- `models.py` created as the shared contract between all 4 devs:
  - `TicketRequest` — incoming booking payload
  - `OfflineSyncPayload` — batch of tickets for offline sync
  - `TicketResponse` — structured response from `/book_ticket`
  - `SyncResponse` — structured response from `/sync_offline`
- `database.py` approach merged into `main.py` — SQLite `ledger` table created via `init_db()`
- CORS middleware added so Dev 3's React app (localhost:5173) can call the API
- Dummy endpoints wired with SHA256 mock hashes:
  - `POST /book_ticket` → returned `0xDUMMY...` hash
  - `POST /sync_offline` → accepted batch, returned count
  - `GET /ledger_live` → returned all saved tickets
  - `GET /stations` → returned 25 Mumbai station names

#### SQLite Schema (ledger table)

```sql
CREATE TABLE IF NOT EXISTS ledger (
    hash           TEXT PRIMARY KEY,
    timestamp      DATETIME,
    commuter_name  TEXT,
    start_station  TEXT,
    end_station    TEXT,
    mode           TEXT,
    distance_km    REAL,
    total_fare     REAL,
    operator_split TEXT,
    start_lat      REAL,
    start_lng      REAL,
    end_lat        REAL,
    end_lng        REAL
)
```

#### Fare Split Logic

```
Local Train → Railways: 95% | TransitOS: 5%
Metro / AC Metro → MMRDA: 90% | TransitOS: 10%
Hybrid → Railways: 50% | BEST: 40% | TransitOS: 10%
Other → Operator: 95% | TransitOS: 5%
```

#### Bonus Tasks Completed During Phase 1

- `GET /health` endpoint added (server + DB status)
- `GET /stats` endpoint added (ticket count, revenue, unique commuters)
- Rate limiting installed via `slowapi` (30 requests/minute on `/book_ticket`)
- `requirements.txt` updated with all packages
- `.gitignore` configured to exclude `.env`, `*.db`, `__pycache__/`, `.venv/`

---

### ✅ Phase 2 — Web3 Bridge (Days 4–6)

**Goal:** Replace all SHA256 mock hashes with real signed blockchain transactions on Polygon Amoy.

#### Dependencies Added

```
pip install web3
```

#### ABI.json — Contract Interface (from Dev 1)

Saved as `Backend/ABI.json`. Key function from the ABI:

```
settleTrip(commuterName, fromStation, toStation, mode, totalFare)
```

> Important: The function is `settleTrip` (not `settleFare`). It takes **5 parameters** and handles the revenue split logic internally inside the Solidity contract.

The ABI also exposes:
- `getOperatorBalance(operatorName)` — reads operator earnings on-chain
- `transitOsRevenue()` — reads TransitOS platform revenue on-chain
- `TripSettled` event — emitted on every successful settlement

#### web3_bridge.py — Implementation

```python
# Connects to Polygon Amoy via Alchemy RPC
# Loads wallet from PRIVATE_KEY in .env
# Loads ABI from ABI.json
# Loads contract from CONTRACT_ADDRESS in .env

def check_connection() -> bool:
    # Returns True if connected to Polygon Amoy

def settle_trip(commuter_name, from_station, to_station, mode, fare) -> str:
    # Converts fare to paise (fare * 100) for on-chain uint256 storage
    # Gets nonce with "pending" tag to handle rapid consecutive transactions
    # Builds, signs, and broadcasts the transaction
    # Returns the real 66-character tx hash (e.g. 0x08fb322...)

def get_operator_balance(operator_name) -> int:
    # Reads operator balance from contract

def get_transitOS_revenue() -> int:
    # Reads TransitOS platform revenue from contract
```

#### Changes to main.py

- `from web3_bridge import settle_trip, check_connection` added to imports
- `load_dotenv()` added after imports
- In `/book_ticket`: SHA256 mock hash line commented out, replaced with:
  ```python
  tx_hash = settle_trip(ticket.commuter_name, ticket.from_station, ticket.to_station, ticket.mode, fare)
  ```
- In `/sync_offline`: Same replacement inside the batch loop
- `/health` endpoint updated to show real Web3 connection status:
  ```python
  "web3_bridge": "connected" if check_connection() else "disconnected"
  ```
- `req: Request` added as first parameter to `book_ticket` (required by slowapi)

#### Wallet & Network Setup

- **Network:** Polygon Amoy Testnet (Chain ID: 80002)
- **RPC:** `https://rpc-amoy.polygon.technology`
- **Explorer:** `https://amoy.polygonscan.com`
- **Test MATIC:** Obtained from `https://faucet.polygon.technology`
- **Alchemy:** Free account created, app created on Polygon Amoy network

#### Verified Transaction

First real blockchain transaction confirmed on Polygonscan:
```
Hash:    0x08fb322281c45d348b9cdc3aa88ccba93e46db176e4a99046ec8e0d2faa96a33
Route:   Goregoan → Churchgate (Local Train)
Fare:    ₹29.34
Split:   Railways: ₹27.9 | TransitOS: ₹1.5
```

✅ Verified at: `https://amoy.polygonscan.com/tx/0x08fb322281c45...`

---

### ✅ Phase 3 — Integration & Offline Sync (Days 7–9)

**Goal:** Ensure `/sync_offline` sends every batched ticket to the blockchain, and that a failed Web3 transaction never corrupts the SQLite database.

#### Days 7–8: Batch Web3 Testing

`/sync_offline` was tested with a batch of 3 tickets. All 3 received unique real transaction hashes:

```
Priya (Bandra → Dadar)     → 0xad9a5757273da722631686d32c7fb3fdde61bcdb3db4021d5638ec7b99dc3545
Amit  (Kurla → Thane)      → 0x1cfa825651bd69f2e5f35e91229a8a297312c30ac8359142aee69aa9cc3157dd
Sara  (Borivali → Churchgate) → 0xa81eab4e3732f20903bf22eedeb119fa02d8464a1f3a9d15a916b451da8916e0
```

All 3 verified on `amoy.polygonscan.com` — status: ✅ Success

#### Day 9: DB Rollbacks & Data Consistency

**Problem being solved:** If `settle_trip()` throws an exception (e.g. Alchemy unreachable, nonce error, insufficient gas), the old code would still attempt to write the ticket to SQLite, creating a phantom record with no real blockchain backing.

**Fix — `status` column added to ledger:**

```sql
ALTER TABLE ledger ADD COLUMN status TEXT DEFAULT 'confirmed'
```

The `init_db()` function was updated to:
1. Include `status TEXT DEFAULT 'confirmed'` in `CREATE TABLE`
2. Run `ALTER TABLE ledger ADD COLUMN status ...` inside a `try/except` so it safely adds the column to any existing database without crashing

**Fix — `/book_ticket` now uses try/except:**

```python
try:
    tx_hash = settle_trip(...)
except Exception as e:
    # Web3 failed → raise HTTP 500 → DB insert never reached
    raise HTTPException(status_code=500, detail=f"Blockchain transaction failed: {str(e)}")

# Only executes if Web3 succeeded:
db.execute("INSERT INTO ledger VALUES (..., 'confirmed')")
```

**Fix — `/sync_offline` isolates each ticket:**

Each ticket in the batch now has its own `try/except` block. If one ticket's blockchain transaction fails, the other tickets in the same batch are unaffected and continue processing. Failed tickets are logged in the response with `"status": "failed: <error>"` instead of crashing the whole batch.

The `INSERT` statements in both endpoints were updated from 13 to 14 `?` placeholders to include the new `status` column value.

**Rollback Test Result:**

Breaking `ALCHEMY_RPC_URL` in `.env` → calling `/book_ticket` → response was:
```json
{"detail": "Blockchain transaction failed: HTTPSConnectionPool(host='broken-url'...)"}
```
Checking `/ledger_live` confirmed the failed ticket was NOT saved to SQLite. ✅ Rollback working correctly.

---

### ✅ Phase 4 — Polish & Optimization (Days 10–13)

**Goal:** Optimize the Web3 bridge, surface on-chain data in the stats endpoint, freeze dependencies, and clean up for deployment.

#### Days 10–11: Optimization

**web3_bridge.py — 30-second timeout added:**

```python
w3 = Web3(Web3.HTTPProvider(
    os.getenv("ALCHEMY_RPC_URL"),
    request_kwargs={"timeout": 30}
))
```

This prevents the server from hanging indefinitely if Alchemy is slow to respond. Previously, a slow RPC call could block the entire FastAPI worker thread with no timeout.

**web3_bridge.py — Nonce strategy changed to `"pending"`:**

```python
nonce = w3.eth.get_transaction_count(account.address, "pending")
```

Using `"pending"` instead of the default `"latest"` prevents nonce collision errors when Dev 4's traffic simulator sends rapid consecutive requests. Without this, two near-simultaneous requests could both read the same nonce and one transaction would be rejected by Polygon.

**`get_operator_balance()` and `get_transitOS_revenue()` — wrapped in try/except:**

Both on-chain read functions now return `0` gracefully if the contract call fails, rather than crashing the stats endpoint.

**`/stats` endpoint updated to show on-chain revenue:**

```python
@app.get("/stats")
def get_stats():
    # SQLite counts (local)
    total_tickets, total_revenue, unique_commuters, confirmed = ...

    # On-chain revenue (real blockchain data)
    onchain_revenue_paise = get_transitOS_revenue()
    onchain_revenue_inr = round(onchain_revenue_paise / 100, 2)

    return {
        "total_tickets": total_tickets,
        "total_revenue_inr": round(total_revenue, 2),
        "unique_commuters": unique_commuters,
        "confirmed_transactions": confirmed,
        "onchain_transitOS_revenue_inr": onchain_revenue_inr
    }
```

**Verified `/stats` output after Phase 4:**

```json
{
  "total_tickets": 12,
  "total_revenue_inr": 591.52,
  "unique_commuters": 8,
  "confirmed_transactions": 12,
  "onchain_transitOS_revenue_inr": 21.15
}
```

#### Days 12–13: Security Cleanup

**Git history audit:**

```bash
git log -p | findstr "PRIVATE_KEY"
```

Run this before pushing to GitHub. If any results appear, the exposed private key must be considered compromised — generate a new Metamask wallet and update `.env`.

**Confirm `.env` is not tracked:**

```bash
git status
```

`.env` and `transitos.db` must not appear in this list. If they do:

```bash
git rm --cached Backend/.env
git rm --cached Backend/transitos.db
git commit -m "Remove sensitive files from tracking"
```

**Freeze exact dependency versions:**

```bash
python -m pip freeze > requirements.txt
```

This pins exact versions (e.g. `fastapi==0.115.0`) so Render deploys the identical environment as local development.

---

## Day 14 — Deployment (Render)

### render.yaml

Create `TransitOS/render.yaml`:

```yaml
services:
  - type: web
    name: transitos-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: python -m uvicorn Backend.main:app --host 0.0.0.0 --port 8000
    envVars:
      - key: ALCHEMY_RPC_URL
        sync: false
      - key: PRIVATE_KEY
        sync: false
      - key: CONTRACT_ADDRESS
        sync: false
```

### Deployment Steps

1. Push repository to GitHub (confirm `.env` is absent from the push)
2. Go to `https://render.com` → sign up with GitHub
3. Click **New +** → **Web Service** → connect your repository
4. Fill in:
   - **Environment:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python -m uvicorn Backend.main:app --host 0.0.0.0 --port 8000`
5. Click **Advanced** → **Add Environment Variable** for all 3 secrets
6. Click **Create Web Service** — deployment takes 3–5 minutes
7. Render provides a live URL: `https://transitos-backend.onrender.com`

### Verify Live Deployment

```
https://transitos-backend.onrender.com/health
https://transitos-backend.onrender.com/docs
https://transitos-backend.onrender.com/stations
```

`/health` must return `"web3_bridge": "connected"` for the deployment to be confirmed working.

Share the live URL with:
- **Dev 3** — to update their Axios base URL from `localhost:8000` to the Render URL
- **Dev 4** — to update dashboard and simulator requests to the live URL

---

## Key Integration Points

| Dev | What They Need From Dev 2 | What Dev 2 Needs From Them |
|---|---|---|
| Dev 1 | `ABI.json` + contract address ✅ received | Nothing — contract already deployed |
| Dev 3 | Live backend URL + JSON schema from `models.py` | Nothing |
| Dev 4 | `/ledger_live`, `/stats` endpoints populated | Nothing |

---

## Known Issues & Fixes

| Error | Cause | Fix |
|---|---|---|
| `uvicorn not recognized` | Not in PATH on Windows | Use `python -m uvicorn main:app --reload` |
| `Non-hexadecimal digit found` | Wallet address pasted instead of private key | Export 64-char private key from Metamask |
| `Expected 32 bytes, got 20` | Same — wallet address (20 bytes) vs private key (32 bytes) | Export correct private key |
| `parameter request must be starlette.requests.Request` | `req: Request` was not the first parameter in `book_ticket` | Move `req: Request` before `ticket: TicketRequest` |
| `table ledger has 13 columns, supplied 14` | Old DB without `status` column | Delete `transitos.db`, restart server to recreate |
| `Nonce too low` | Two near-simultaneous transactions used the same nonce | Use `get_transaction_count(address, "pending")` |

---

## Smart Contract Reference

- **Network:** Polygon Amoy Testnet (Chain ID: 80002)
- **Contract:** `0x099439A86624942d2A151e0C81B698BA1a197A72`
- **Explorer:** `https://amoy.polygonscan.com/address/0x099439A86624942d2A151e0C81B698BA1a197A72`

### Key Function

```
settleTrip(
    string commuterName,
    string fromStation,
    string toStation,
    string mode,
    uint256 totalFare   ← fare in paise (INR × 100)
)
```

### Key Event (emitted on every trip)

```
TripSettled(
    commuterName,
    fromStation,
    toStation,
    mode,
    totalFare,
    transitOsShare
)
```
