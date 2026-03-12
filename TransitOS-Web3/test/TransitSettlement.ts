// @ts-nocheck
import "@nomicfoundation/hardhat-toolbox"; 
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("TransitSettlement Kernel Stress Test", function () {
  let transitContract: any; 
  let owner: any;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const TransitSettlementFactory = await ethers.getContractFactory("TransitSettlement");
    transitContract = await TransitSettlementFactory.deploy();
    await transitContract.waitForDeployment();
  });

  describe("Revenue Splitting Logic", function () {
    it("Should correctly take a 5% platform fee", async function () {
      const fare = 10000; 
      await transitContract.settleTrip("Alice", "StationA", "StationB", "Mumbai_Metro", fare);
      const osRevenue = await transitContract.transitOsRevenue();
      expect(osRevenue).to.equal(500);
    });

    it("Should execute 60/40 split for 'Hybrid' mode", async function () {
      const fare = 10000; 
      await transitContract.settleTrip("Bob", "Andheri", "Bandra", "Hybrid", fare);
      const metroBalance = await transitContract.operatorBalances("Mumbai_Metro");
      const busBalance = await transitContract.operatorBalances("BEST_Bus");
      expect(metroBalance).to.equal(5700);
      expect(busBalance).to.equal(3800);
    });
  });

  describe("Matchers Check", function () {
    it("Should emit a TripSettled event", async function () {
      await expect(transitContract.settleTrip("Dave", "A", "B", "Metro", 1000))
        .to.emit(transitContract, "TripSettled");
    });

    it("Should not revert on valid input", async function () {
      await expect(transitContract.settleTrip("Eve", "A", "B", "Metro", 1000))
        .to.not.be.reverted;
    });
  });
});