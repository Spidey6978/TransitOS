import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    polygonAmoy: {
      url: process.env.ALCHEMY_RPC_URL || "",
      // Cast as 'any' to bypass strict ESM interface matching for process.env
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    } as any 
  }
};

export default config;