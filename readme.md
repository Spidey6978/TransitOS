🚦 TransitOS: Unified Mobility Kernel

TransitOS is a decentralized transit settlement engine designed for high-volume urban environments like Mumbai. It restructures fragmented transit logic into a trustless, 60/40 revenue-splitting (will be modified to proper fare-per-mode splitting later) kernel on the Polygon blockchain.

This is the backend for TransitOS, working alongside the TransitOS-Frontend.

🏗 System Architecture

Instead of relying on ephemeral cloud free-tiers that wipe our database, we are using a Reverse Proxy Edge Architecture.

Frontend (React/PWA): Commuters scan QR codes on their phone. The app generates a unique ticket_id (UUID) and sends an Axios POST request to the cloud.

The Wormhole (Ngrok): The cloud URL routes the traffic securely into our local command center, bypassing CORS and build times.

The Kernel (FastAPI): Validates the geography, checks for replay attacks, and calculates the exact fare and distance using Haversine math.

The Bridge (Web3.py): Signs the transaction and pushes the 60/40 revenue split to the Polygon Amoy blockchain.

The Ledger (SQLite): Caches the finalized transaction locally.

Command Center (Streamlit): Reads the local ledger and maps the live transit data on a 3D geospatial mesh.

🚀 Quick Start (The Ignition Sequence)

To run the entire system, you will need 3 Terminal windows open.

Step 0: Prerequisites

Pull the latest master branch.

Run pip install -r requirements.txt.

Ensure you have your .env file in the root directory with ALCHEMY_RPC_URL, PRIVATE_KEY, and CONTRACT_ADDRESS.

Step 1: Start the Engine (Terminal 1)

Boot up the FastAPI kernel and SQLite database.

python -m uvicorn Backend.main:app --port 8000


Step 2: Open the Tunnel (Terminal 2)

Expose the local engine to the live internet.

ngrok http --domain=touchily-steamerless-alyssa.ngrok-free.dev 8000


The API is now live at: https://touchily-steamerless-alyssa.ngrok-free.dev/docs

Step 3: Launch Command Center (Terminal 3)

Boot up the 3D monitoring map.

streamlit run Frontend/dashboard.py


🛡️ Security Features (Chaos Engineering)

We have stress-tested the backend against various exploits. The following shields are currently active:

The Ghost Shield: Validates all incoming coordinate pairs against a strict whitelist. Attempting to book a ticket to a fake station results in a 400 Bad Request.

The Idempotency Shield: Prevents double-charging. Every ticket payload must include a unique ticket_id string. Submitting the same ID twice yields a 409 Conflict.

The Nonce Healer: A thread-safe web3 lock that automatically repairs sequence collisions if the blockchain throttles our offline-sync avalanches.

📋 Next Steps / Developer Action Items

🧑‍💻 Dev 3 (Frontend / React)

Clean Workspace: Your current branch accidentally contains an outdated copy of the Python backend. Please delete the Backend/, Frontend/, and Scripts/ folders from your React workspace to avoid merge conflicts.

API Connection: Point all your Axios requests to the live tunnel: https://touchily-steamerless-alyssa.ngrok-free.dev.

UUID Generation: Update your payload JSON to include a ticket_id field. Use a library like uuid to generate a unique string for every single QR code/scan. If you do not include this, the API will reject the request with a 422 error.

🧑‍💻 Dev 4 (Data / Dashboard)

Pull Latest: The dashboard has been upgraded to a PyDeck 3D mesh with auto-refresh ("Satellite Link") and a live Emergency Reset button.

Test: Run the Scripts/simulate_traffic.py script to verify the map coloring and arc rendering on your machine.

🧑‍💻 Dev 1 & 2 (Web3 / Backend)

Monitor RPC: Keep an eye on Alchemy request limits during high-volume simulated traffic.

Demo Prep: Ensure the Polygonscan contract link is ready for the Devpost submission.

ALCHEMY_RPC_URL="[https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY](https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY)"
PRIVATE_KEY="YOUR_METAMASK_PRIVATE_KEY"
CONTRACT_ADDRESS="0x099439A86624942d2A151e0C81B698BA1a197A72"


⚠️ The "War Room" (Known Issues & Fixes)

During development, we encountered several critical ecosystem errors. Here is the documentation on how we solved them:

1. The "Dependency Hell" (ERESOLVE)

Error: npm error ERESOLVE unable to resolve dependency tree
Cause: Hardhat v3 is bleeding-edge. Plugins like Typechain still expect Hardhat v2.
Fix: Always use --legacy-peer-deps during installation to force npm to ignore version peer-mismatches.

2. The "Class Extends Undefined" (Ethers v6 Conflict)

Error: TypeError: Class extends value undefined is not a constructor
Cause: A version mismatch between @nomicfoundation/hardhat-ethers and the base ethers library (v5 vs v6).
Fix: We strictly locked the package.json to ethers: ^6.11.0 and hardhat-toolbox: ^4.0.0. Do NOT run npm audit fix --force as it will break this delicate balance.

3. The "Google Search" RPC Trap

Error: Web3 Bridge Error: Invalid URL
Cause: Copy-pasting the Alchemy URL sometimes includes a Google Search prefix (google.com/search?q=...).
Fix: Ensure the URL starts strictly with https://polygon-amoy....

4. ESM Module Extension Error

Error: Unknown file extension ".ts" for deploy.ts
Cause: Node.js (in ESM mode) struggles to execute TypeScript files directly via npx hardhat run without complex loaders.
Fix: Use deploy.js (Native JavaScript) for the deployment task to ensure a zero-failure execution path.

5. Typechain Ghost Errors

Error: 12+ errors in .ts files regarding missing TransitSettlement types.
Cause: The typechain-types folder is only generated after a successful npx hardhat compile.
Fix: Use // @ts-nocheck at the top of test files and declare contracts as any to allow the logic to run even if the static type-checker is lagging.

🏗 Architecture

Solidity: Handles the 5% platform fee and 60/40 "Hybrid" split logic.

Hardhat: Development environment for testing and deployment.

Web3.py: The bridge allowing the Python FastAPI backend to sign transactions and push them to Polygon.

Polygon Amoy: The Layer 2 settlement layer providing low-cost transaction finality.
