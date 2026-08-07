# 🚦 TransitOS

> 🏆 **Winner — Blockchain Track @ CodeSangram Online Hackathon 2026**  
> **A Decentralized, Edge-First Mobility Kernel for Urban Transit**

---

## 🌟 Overview

**TransitOS** is a unified mobility operating system designed to eradicate the fragmentation of urban public transit. By moving away from closed-loop proprietary hardware and localized ticketing silos, TransitOS leverages edge-computing and Web3 settlement to create a seamless *"One ID, One Ticket, Any Mode"* experience across diverse municipal operators (e.g., State Metro, City Buses, Suburban Rail, and Gig Transit).

We ensured **100% validation uptime** in cellular dead zones, supporting processing bursts of **50+ batched tickets per second** upon reconnection, by engineering an optimistic edge-validation architecture utilizing encrypted local storage queues.

---

## 🏗️ Architecture & Project Structure

TransitOS is structured as a full-stack monorepo:

```
TransitOS/
├── src/                      # Frontend React + Vite Web Application
├── public/                   # Frontend Static Assets
├── Backend/                  # FastAPI Backend Engine (Oracle, OSRM Routing, Web3 Bridge, QR Codec)
├── TransitOS-Web3/           # Hardhat Web3 Smart Contracts & Deployment Scripts (TransitSettlement.sol)
├── LiveDashboard/            # Real-Time Monitoring Dashboard
├── Scripts/                  # Traffic Simulation, Chaos Testing & Maintenance Scripts
├── package.json              # Frontend Dependencies & Scripts
├── requirements.txt          # Python Backend & Dashboard Dependencies
└── README.md
```

### 🎨 1. Frontend (React + Vite + Tailwind CSS)
Located at root (`src/`, `package.json`, `vite.config.js`).
- **User Portal**: Multi-leg route planning, ticket booking, wallet management, and QR ticket rendering (`src/pages/Booktrip/`, `src/pages/Wallets/`).
- **Driver & Conductor Portals**: Active trip management, driver earnings/withdrawals, and multi-role QR ticket validator (`src/pages/Driver/`, `src/pages/QRValidator/`).
- **Admin Dashboard & Map**: Live traffic map and analytics (`src/pages/TrafficMap/`, `src/pages/Dashboard/`).

### ⚡ 2. Backend Engine (FastAPI & Web3 Bridge)
Located in `Backend/`.
- `main.py`: Core FastAPI REST server with `slowapi` rate limiting (30 req/min).
- `web3_bridge.py`: Interface with EVM RPC & Polygon Amoy smart contracts with a thread-safe `get_next_nonce()` Nonce Healer.
- `osrm_routing.py`: Open Source Routing Machine integration with LRU caching for real road paths.
- `fare_oracle.py` & `mumbai_fares.json`: Dynamic fare calculation matrix for public transit (Headcount model) & gig vehicles (Vehicle capacity model with congestion multipliers).
- `qr_codec.py`: Minified 7-field compressed string format with tamper-detection for offline operations.

### 📜 3. Web3 Smart Contracts (Solidity + Hardhat)
Located in `TransitOS-Web3/`.
- `contracts/TransitSettlement.sol`: On-chain automated fare distribution, escrow, and multi-operator settlement contract deployed on Polygon Amoy.
- Hardhat deployment & test suite (`scripts/deploy.ts`, `test/TransitSettlement.ts`).

### 📊 4. Live Command Center
Located in `LiveDashboard/`.
- `dashboard.py`: Real-time 3D geospatial monitoring dashboard built with Streamlit, PyDeck, and Plotly, displaying 4-mode economic revenue breakdowns (Suburban Rail, Metro, BEST Bus, Auto/Gig) and OSRM road paths.

---

## 🔌 Core API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | `GET` | Health check & system status |
| `/stations` | `GET` | Returns list of supported Mumbai transit stations |
| `/routes` | `GET` | Ghost-Shield protected route finder (Train, Hybrid, BEST Bus) |
| `/book_ticket` | `POST` | Primary ticket booking endpoint with Web3 settlement & Circuit Breaker |
| `/book_private_legs` | `POST` | Gig transit booking with `0x000...` placeholder escrow wallet |
| `/driver_scan` | `POST` | Handshake assigning driver wallet to pending gig escrow |
| `/driver_cancel` | `POST` | Sweeps unassigned gig escrow back to treasury for 100% commuter refund |
| `/user_cancel` | `POST` | User cancellation applying ₹0.50 anti-griefing micro-fee |
| `/sync_offline` | `POST` | Offline QR batch processing & Web3 synchronization |
| `/validate_ticket` | `POST` | Ticket validation against local SQLite ledger |
| `/ledger_live` | `GET` | Live ledger feed for dashboard telemetry |
| `/stats` | `GET` | Network totals (tickets, revenue, unique commuters) |
| `/driver_wallet` & `/withdraw_fiat` | `GET/POST` | Driver earnings & IMPS off-ramp interface |

---

## 🚀 Impact & Key Features

- **Instant On-Chain Settlement**: Eliminated inter-operator revenue reconciliation delays from days to T+0 by deploying a Solidity smart contract on Polygon Amoy that atomically distributes dynamic `address[]` operator splits in a single transaction.
- **Idempotency Shield**: Prevented 100% of replay attack attempts by implementing a UUID idempotency shield that queries SQLite before touching the fare oracle or blockchain, returning `409 Conflict` on duplicate ticket IDs.
- **Offline Edge Uptime**: Achieved 100% validation uptime in cellular dead zones by engineering an optimistic edge-validation architecture processing 50+ batched offline QR tickets per second upon reconnection via `/sync_offline`.
- **Nonce Healer**: Thread-safe Web3 lock prevents blockchain nonce collisions when `/sync_offline` processes large batches of tickets simultaneously under heavy concurrent loads.
- **Real-World Mumbai Pricing**: Computed real Mumbai transit fares using a programmatically generated matrix of 200+ routes across Western Railway, Central Railway, Harbour Line, Metro, and Monorail — sourced from actual RTO and operator slab data.
- **Gig Transit Layer**: Private legs (auto, taxi, bike) booked with placeholder wallets in escrow, resolved via driver scan or refunded on cancellation.

---

## 📜 Smart Contract Architecture

`TransitSettlement.sol` deployed on Polygon Amoy L2.

- `settleTrip(commuterName, address[] operators, uint256[] amounts, uint256 totalFare)` — distributes dynamic operator splits atomically. On-chain guards verify array lengths match and total payouts + 5% platform fee do not exceed total fare.
- `reclaimPendingEscrow(uint256 amountWei)` — owner-only sweep of unassigned gig escrow back to treasury wallet.
- `operatorBalances(address)` — public view for per-operator balance queries.

---

## ⚡ Scripts & Chaos Engineering

Located in `Scripts/`:

### Chaos Testing Suite
- `Scripts/chaos_ghost.py` — injects fake station coordinates to verify Ghost Shield returns `400 Bad Request`.
- `Scripts/chaos_repeat.py` — spams identical ticket UUIDs to verify Idempotency Shield returns `409 Conflict`.
- `Scripts/chaos_sync.py` — fires 10 concurrent offline QR batches to stress-test the Nonce Healer and batch sync pipeline.

### Simulation & Utilities
- `Scripts/simulate_traffic.py` — simulates live multi-modal commuter ticket requests to feed telemetry.
- `Scripts/simulate_refund.py` — tests gig transit cancellation & refund flows.
- `Scripts/test_v2_engine.py` — end-to-end test suite for backend route calculation & Web3 settlement.
- `Scripts/check_balances.py` — checks Web3 operator wallet balances on Polygon.
- `Scripts/env_doctor.py` — diagnostic script verifying RPC URL, private keys, and contract address config.
- `Scripts/generate_dataset.py` — populates transit fare matrix datasets.
- `Scripts/keep_alive.py` — heartbeat utility for continuous node connectivity.

---

## 🚀 Quick Start Guide

### 1. Backend & Live Dashboard Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run Backend FastAPI Server
python -m Backend.main

# Launch Live 3D Command Center Dashboard
streamlit run LiveDashboard/dashboard.py
```

### 2. Frontend Setup
```bash
# Install Node dependencies
npm install

# Run Frontend Development Server
npm run dev
```

### 3. Smart Contracts (Hardhat)
```bash
cd TransitOS-Web3
npm install
npx hardhat compile
npx hardhat test
```

---

## 🛠️ Tech Stack

**Frontend**: React, Vite, Tailwind CSS, Lucide Icons, Ethers.js  
**Backend**: Python, FastAPI, Web3.py, SQLite, OSRM, SlowAPI, Ngrok  
**Blockchain**: Solidity, Hardhat, Polygon Amoy L2, Alchemy RPC  
**Dashboard & Analytics**: Streamlit, PyDeck, Plotly  
