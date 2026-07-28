// @ts-nocheck
import "@nomicfoundation/hardhat-toolbox"; 
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("TransitSettlement V2 Engine Stress Test", function () {
  let transitContract: any; 
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    // We grab actual Hardhat dummy wallets to act as our "Operators"
    [owner, addr1, addr2] = await ethers.getSigners();
    const TransitSettlementFactory = await ethers.getContractFactory("TransitSettlement");
    transitContract = await TransitSettlementFactory.deploy();
    await transitContract.waitForDeployment();
  });

  describe("Dynamic Revenue Splitting", function () {
    
    it("Should correctly take a 5% platform fee from a single operator", async function () {
      const totalFare = 10000; // Let's pretend this is wei
      // 95% of 10000 = 9500
      const operators = [addr1.address];
      const amounts = [9500];

      await transitContract.settleTrip("V2_Test_Commuter", operators, amounts, totalFare);
      
      const osRevenue = await transitContract.transitOsRevenue();
      // Total fare (10000) - Operator Payout (9500) = 500
      expect(osRevenue).to.equal(500); 
    });

    it("Should correctly update multiple operator balances from dynamic arrays", async function () {
      const totalFare = 100000;
      
      // Simulating a Hybrid Trip: 
      // addr1 (Metro) gets 40,000 | addr2 (Train) gets 55,000 | TransitOS gets 5,000
      const operators = [addr1.address, addr2.address];
      const amounts = [40000, 55000];

      await transitContract.settleTrip("Hybrid_Test_Commuter", operators, amounts, totalFare);
      
      const metroBalance = await transitContract.operatorBalances(addr1.address);
      const trainBalance = await transitContract.operatorBalances(addr2.address);
      
      expect(metroBalance).to.equal(40000);
      expect(trainBalance).to.equal(55000);
    });

    it("Should revert if arrays are mismatched", async function () {
      const totalFare = 10000;
      // We pass 2 operators but only 1 amount. The contract should aggressively reject this.
      const operators = [addr1.address, addr2.address];
      const amounts = [9500];

      await expect(
        transitContract.settleTrip("Hacker_Attempt", operators, amounts, totalFare)
      ).to.be.revertedWith("Array mismatch");
    });
  });

  describe("Event Emission Check", function () {
    it("Should emit a TripSettled event", async function () {
      const operators = [addr1.address];
      const amounts = [9500];
      const totalFare = 10000;

      await expect(transitContract.settleTrip("Event_Tester", operators, amounts, totalFare))
        .to.emit(transitContract, "TripSettled")
        .withArgs("Event_Tester", totalFare, 500); // Expecting exactly 500 as the 5% cut
    });
  });
});