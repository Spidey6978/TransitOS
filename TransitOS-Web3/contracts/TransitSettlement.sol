// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TransitSettlement {
    address public owner;
    // Changed from string to address to support direct EVM wallet payouts
    mapping(address => uint256) public operatorBalances;
    uint256 public transitOsRevenue;

    // Simplified event since we no longer have a single "mode" or "to/from" on chain
    event TripSettled(
        string commuterName,
        uint256 totalFare,
        uint256 transitOsShare
    );

    constructor() {
        owner = msg.sender;
    }

    // V2 Dynamic Settlement Function
    function settleTrip(
        string memory commuterName,
        address[] calldata operators,
        uint256[] calldata amounts,
        uint256 totalFare 
    ) public {
        // SECURITY BOMB PREVENTED: Ensure arrays match
        require(operators.length == amounts.length, "Array mismatch");
        
        uint256 transitOsShare = (totalFare * 5) / 100; // 5% flat fee
        uint256 totalPayout = 0;

        // Loop through the dynamic arrays and distribute funds
        for (uint256 i = 0; i < operators.length; i++) {
            operatorBalances[operators[i]] += amounts[i];
            totalPayout += amounts[i];
        }

        // SECURITY BOMB PREVENTED: Ensure backend math doesn't steal from platform
        require(totalPayout + transitOsShare <= totalFare, "Payout exceeds total fare");

        transitOsRevenue += transitOsShare;
        emit TripSettled(commuterName, totalFare, transitOsShare);
    }

    // --- V3 REFUND ARCHITECTURE ---
    // Allows the backend (Owner) to reclaim funds from unassigned gig-workers (0x000)
    function reclaimPendingEscrow(uint256 amountWei) public {
        require(msg.sender == owner, "Only Admin can sweep escrow");
        
        address pendingWallet = address(0);
        require(operatorBalances[pendingWallet] >= amountWei, "No pending funds to sweep");
        
        // Remove from the void, sweep back to the TransitOS Treasury
        operatorBalances[pendingWallet] -= amountWei;
        operatorBalances[owner] += amountWei;
    }
}