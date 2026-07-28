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
- User ticketing portal, multi-leg route planning, conductor/driver active trip management, group ticketing, and QR validator.

### ⚡ 2. Backend Engine (FastAPI & Web3 Bridge)
Located in `Backend/`.
- `main.py`: Core FastAPI endpoints & rate limiting.
- `web3_bridge.py`: Interface with EVM RPC & Polygon Amoy smart contracts.
- `osrm_routing.py`: Open Source Routing Machine integration for multi-modal pathfinding.
- `fare_oracle.py` & `mumbai_fares.json`: Dynamic fare calculation & station distance database.
- `qr_codec.py`: Encrypted ticket payload codec for offline operation.

### 📜 3. Web3 Smart Contracts (Solidity + Hardhat)
Located in `TransitOS-Web3/`.
- `contracts/TransitSettlement.sol`: On-chain automated fare distribution, escrow, and multi-operator settlement smart contract.
- Includes Hardhat deployment and test suites (`scripts/deploy.ts`, `test/TransitSettlement.ts`).

### 📊 4. Live Command Center & Simulation
- `LiveDashboard/dashboard.py`: Real-time 3D geospatial monitoring dashboard built with Streamlit & PyDeck.
- `Scripts/`: Traffic simulation (`simulate_traffic.py`), refund engine simulation, balance checkers, and chaos sync utilities.

---

## 🚀 Impact & Achievements

- **Instant On-Chain Settlement**: Eliminated inter-operator revenue reconciliation delays from days to T+0 by deploying a Solidity smart contract on Polygon Amoy that atomically distributes dynamic `address[]` operator splits in a single transaction.
- **Idempotency Shield**: Prevented 100% of replay attack attempts by implementing a UUID idempotency shield that queries SQLite before touching the fare oracle or blockchain, returning `409 Conflict` on duplicate ticket IDs.
- **Offline Edge Uptime**: Achieved 100% validation uptime in cellular dead zones by engineering an optimistic edge-validation architecture processing 50+ batched offline QR tickets per second upon reconnection via `/sync_offline`.
- **Nonce Healer**: Thread-safe Web3 lock prevents blockchain nonce collisions when `/sync_offline` processes large batches of tickets simultaneously under heavy concurrent loads.
- **Real-World Mumbai Pricing**: Computed real Mumbai transit fares using a programmatically generated matrix of 200+ routes across Western Railway, Central Railway, Harbour Line, Metro, and Monorail — sourced from actual RTO and operator slab data.
- **Gig Transit Layer**: Private legs (auto, taxi, bike) booked with placeholder wallets in escrow, resolved via driver scan or refunded on cancellation.

---

## 📜 Smart Contract Architecture

`TransitSettlement.sol` deployed on Polygon Amoy L2.

- `settleTrip(commuterName, address[] operators, uint256[] amounts, uint256 totalFare)` — distributes dynamic operator splits atomically. On-chain guards verify array lengths match and total payouts do not exceed total fare.
- `reclaimPendingEscrow(uint256 amountWei)` — owner-only sweep of unassigned gig escrow back to treasury wallet.
- `operatorBalances(address)` — public view for per-operator balance queries.

---

## ⚡ Chaos Engineering

Three active attack scripts validate the security shields:

- `Scripts/chaos_ghost.py` — injects fake station coordinates to verify Ghost Shield returns 400 Bad Request.
- `Scripts/chaos_repeat.py` — spams identical ticket UUIDs to verify Idempotency Shield returns 409 Conflict.
- `Scripts/chaos_sync.py` — fires 10 concurrent offline QR batches to stress-test the Nonce Healer and batch sync pipeline.

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
