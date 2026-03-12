import hre from "hardhat";

async function main() {
  const { ethers } = hre; // Pulling ethers directly from the Runtime Environment
  console.log("🚀 Starting TransitOS Settlement Contract Deployment...");

  const TransitSettlement = await ethers.getContractFactory("TransitSettlement");
  const transitContract = await TransitSettlement.deploy();
  await transitContract.waitForDeployment();

  const contractAddress = await transitContract.getAddress();
  
  console.log("✅ SUCCESS!");
  console.log(`📜 Contract deployed to Polygon Amoy Address: ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});