// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ReceiptTokenFactory
/// @notice On-chain registry that stores disclosure metadata and provenance for each
///         bridged mirror token on the public chain. The actual receipt tokens are the
///         mirror contracts auto-deployed by the Rayls relayer — this contract annotates them.
contract ReceiptTokenFactory is Ownable {

    struct ReceiptInfo {
        bytes32 assetId;
        address mirrorTokenAddress;
        string assetType;               // "INVOICE", "BOND", "ABS"
        string disclosureJSON;          // Bucketed disclosure fields
        bytes32 complianceReportHash;
        bytes32 policyVersionHash;
        bytes32 governanceApprovalTx;
        uint256 maturityTimestamp;
        uint256 principalValue;         // 18-decimal wei
        uint256 expectedYieldValue;     // 18-decimal wei
    }

    mapping(bytes32 => ReceiptInfo) private _receipts;
    bytes32[] public receiptIds;
    mapping(string => bytes32[]) private _receiptsByType;

    event ReceiptRegistered(bytes32 indexed assetId, address mirrorTokenAddress, string assetType);

    constructor() Ownable(msg.sender) {}

    function registerReceipt(ReceiptInfo calldata info) external onlyOwner {
        require(info.assetId != bytes32(0), "Invalid assetId");
        require(info.mirrorTokenAddress != address(0), "Invalid mirror address");
        require(_receipts[info.assetId].assetId == bytes32(0), "Already registered");

        _receipts[info.assetId] = info;
        receiptIds.push(info.assetId);
        _receiptsByType[info.assetType].push(info.assetId);

        emit ReceiptRegistered(info.assetId, info.mirrorTokenAddress, info.assetType);
    }

    function getReceipt(bytes32 assetId) external view returns (ReceiptInfo memory) {
        return _receipts[assetId];
    }

    function getAllReceiptIds() external view returns (bytes32[] memory) {
        return receiptIds;
    }

    function getReceiptsByType(string calldata assetType) external view returns (bytes32[] memory) {
        return _receiptsByType[assetType];
    }
}
