# 🚦 TransitOS
> **Winner - Blockchain Track @ CodeSangram Online Hackathon 2026**
> A Decentralized, Edge-First Mobility Kernel for Urban Transit.

---

## 🌟 Overview

**TransitOS** is a unified mobility operating system designed to eradicate the fragmentation of urban public transit. By moving away from closed-loop proprietary hardware and localized ticketing silos, TransitOS leverages edge-computing and Web3 settlement to create a seamless *"One ID, One Ticket, Any Mode"* experience across diverse municipal operators (e.g., State Metro, City Buses, Suburban Rail).

We ensured **100% validation uptime** in cellular dead zones, supporting processing bursts of **50+ batched tickets per second** upon reconnection, by engineering an optimistic edge-validation architecture utilizing encrypted local storage queues.

---

## 🏗️ Architecture & Project Structure

The project is structured as a full-stack monorepo:

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

### 1. 🎨 Frontend (React + Vite + Tailwind CSS)
Located at root (`src/`, `package.json`, `vite.config.js`).
- User ticketing portal, multi-leg route planning, conductor/driver active trip management, and QR validator.

### 2. ⚡ Backend Engine (Python FastAPI)
Located in `Backend/`.
- `main.py`: Core FastAPI endpoints.
- `web3_bridge.py`: Interface with Ethereum/EVM RPC and smart contracts.
- `osrm_routing.py`: Open Source Routing Machine integration for multi-modal pathfinding.
- `fare_oracle.py` & `mumbai_fares.json`: Dynamic fare calculation & station distance database.
- `qr_codec.py`: Encrypted ticket payload codec.

### 3. 📜 Web3 Smart Contracts (Hardhat + Solidity)
Located in `TransitOS-Web3/`.
- `contracts/TransitSettlement.sol`: On-chain automated fare distribution, escrow, and multi-operator settlement smart contract.
- Includes Hardhat deployment and test suites (`scripts/deploy.ts`, `test/TransitSettlement.ts`).

### 4. 📊 Live Dashboard & Simulation
- `LiveDashboard/dashboard.py`: Real-time operational monitoring dashboard.
- `Scripts/`: Traffic simulation (`simulate_traffic.py`), refund engine simulation, balance checkers, and chaos sync utilities.

---

## 🚀 Quick Start

### Backend & Live Dashboard Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run Backend FastAPI Server
python -m Backend.main

# Launch Live Monitoring Dashboard
streamlit run LiveDashboard/dashboard.py
```

### Frontend Setup
```bash
# Install Node dependencies
npm install

# Run Development Server
npm run dev
```

### Smart Contract Deployment (Hardhat)
```bash
cd TransitOS-Web3
npm install
npx hardhat compile
npx hardhat test
```
