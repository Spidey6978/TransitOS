// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TransitSettlement {
    address public owner;
    mapping(string => uint256) public operatorBalances;
    uint256 public transitOsRevenue;

    event TripSettled(
        string commuterName,
        string fromStation,
        string toStation,
        string mode,
        uint256 totalFare,
        uint256 transitOsShare
    );

    constructor() {
        owner = msg.sender;
    }

    function settleTrip(
        string memory commuterName,
        string memory fromStation,
        string memory toStation,
        string memory mode,
        uint256 totalFare 
    ) public {
        
        uint256 transitOsShare = (totalFare * 5) / 100; // 5% flat fee
        uint256 remainingFare = totalFare - transitOsShare;

        if (keccak256(abi.encodePacked(mode)) == keccak256(abi.encodePacked("Hybrid"))) {
            uint256 metroShare = (remainingFare * 60) / 100;
            uint256 busShare = remainingFare - metroShare;
            
            operatorBalances["Mumbai_Metro"] += metroShare;
            operatorBalances["BEST_Bus"] += busShare;
        } else {
            operatorBalances[mode] += remainingFare;
        }

        transitOsRevenue += transitOsShare;
        emit TripSettled(commuterName, fromStation, toStation, mode, totalFare, transitOsShare);
    }
}