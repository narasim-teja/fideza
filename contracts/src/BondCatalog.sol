// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title BondCatalog
/// @notice Public-chain registry of rated bond properties.
///         Exposes only public-safe fields — no exact coupons, no token addresses,
///         no par values. Privacy-preserving view of the bond universe.
contract BondCatalog is Ownable {
    struct PublicBondInfo {
        bytes32 assetId;
        string assetType;       // "BOND", "INVOICE", "ABS_TRANCHE"
        string rating;          // "BB+", "A-", "AAA", etc.
        string couponRange;     // "3-6%", "0-3%", etc. (NOT exact bps)
        string maturityBucket;  // "0-2 years", "2-5 years", "5-10 years"
        string currency;        // "USD", "BRL"
        string issuerCategory;  // "Energy", "Construction", etc.
        bool hasCollateral;
        uint8 riskScore;        // 0-100
    }

    mapping(bytes32 => PublicBondInfo) private _bonds;
    mapping(bytes32 => bool) private _exists;
    bytes32[] public bondIds;

    event BondCatalogued(bytes32 indexed assetId, string assetType, string rating);

    constructor() Ownable(msg.sender) {}

    /// @notice Register a rated bond in the public catalog.
    function registerBond(PublicBondInfo calldata info) external onlyOwner {
        require(info.assetId != bytes32(0), "Invalid assetId");
        require(!_exists[info.assetId], "Bond already registered");

        _bonds[info.assetId] = info;
        _exists[info.assetId] = true;
        bondIds.push(info.assetId);

        emit BondCatalogued(info.assetId, info.assetType, info.rating);
    }

    /// @notice Get a single bond by asset ID.
    function getBond(bytes32 assetId) external view returns (PublicBondInfo memory) {
        require(_exists[assetId], "Bond not found");
        return _bonds[assetId];
    }

    /// @notice Get all registered bonds.
    function getAllBonds() external view returns (PublicBondInfo[] memory) {
        PublicBondInfo[] memory result = new PublicBondInfo[](bondIds.length);
        for (uint256 i = 0; i < bondIds.length; i++) {
            result[i] = _bonds[bondIds[i]];
        }
        return result;
    }

    /// @notice Get total number of registered bonds.
    function getBondCount() external view returns (uint256) {
        return bondIds.length;
    }
}
