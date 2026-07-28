const hre = require("hardhat");

async function main() {
  console.log(" Starting TransitOS Settlement Contract Deployment...");

  // Pull ethers directly from the Hardhat Runtime Environment
  const TransitSettlement = await hre.ethers.getContractFactory("TransitSettlement");
  const transitContract = await TransitSettlement.deploy();
  await transitContract.waitForDeployment();

  const contractAddress = await transitContract.getAddress();
  
  console.log(" SUCCESS!");
  console.log(` Contract deployed to Polygon Amoy Address: ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});