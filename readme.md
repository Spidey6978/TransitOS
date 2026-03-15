USe this branch to test any additional features you wish to add. Only open a PR if the code doesnt break after adding that feature. DO NOT TRY TO MERGE WITH MASTER DIRECTLY

first run the virtual env commands in the commands.txt then install them using pip install -r requirements.txt
wait for the installation to complete and proceed

Setting up the blockchain

🚀 Quick Start (Running the System)

1. Smart Contract Layer (Node.js/Hardhat)

The contract is already deployed to Polygon Amoy at: 0x099439A86624942d2A151e0C81B698BA1a197A72.

If you need to re-run tests or re-deploy:

Navigate to TransitOS-Web3/.

Install dependencies (using the legacy flag to bypass version conflicts):

npm install --legacy-peer-deps


Run Local Tests:

npx hardhat test


Deploy (using the JS script to avoid ESM extension errors):

npx hardhat run scripts/deploy.js --network polygonAmoy


2. Backend Bridge (Python)

Navigate to the root folder.

Activate your virtual environment:

.venv\Scripts\activate  # Windows


Install dependencies:

pip install -r requirements.txt


Run the isolated Web3 test:

python web3_plugin.py


🛠 Configuration (.env)

You must have a .env file in both the TransitOS-Web3/ folder and the Python Backend/ folder.

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
