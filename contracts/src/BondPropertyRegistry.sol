// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title BondPropertyRegistry
/// @notice Catalog of rated bond properties on Privacy Node.
///         AI Rating Agent writes here; Portfolio Agent reads here.
contract BondPropertyRegistry is Ownable {
    struct RatedBondProperties {
        bytes32 assetId;
        address bondTokenAddress;
        string assetType;
        string rating;
        uint256 couponRateBps;
        string couponRange;
        string maturityBucket;
        uint256 maturityTimestamp;
        string seniority;
        string currency;
        string issuerCategory;
        uint256 parValue;
        bool hasCollateral;
        uint8 riskScore;
        bytes32 complianceReportHash;
        bool availableForPortfolio;
        uint256 availableSupply;
    }

    mapping(bytes32 => RatedBondProperties) private _bonds;
    mapping(bytes32 => bool) private _exists;
    bytes32[] public bondIds;

    address public agentAddress;
    address public vaultContract;

    event BondRegistered(bytes32 indexed assetId, string assetType, string rating);
    event AvailabilityUpdated(bytes32 indexed assetId, uint256 newSupply);

    constructor(address _agentAddress) Ownable(msg.sender) {
        require(_agentAddress != address(0), "Invalid agent address");
        agentAddress = _agentAddress;
    }

    modifier onlyOwnerOrAgent() {
        require(msg.sender == owner() || msg.sender == agentAddress, "Not authorized");
        _;
    }

    modifier onlyVault() {
        require(msg.sender == vaultContract, "Only vault");
        _;
    }

    function registerBond(RatedBondProperties calldata props) external onlyOwnerOrAgent {
        require(!_exists[props.assetId], "Bond already registered");
        require(props.bondTokenAddress != address(0), "Invalid token address");

        _bonds[props.assetId] = props;
        _exists[props.assetId] = true;
        bondIds.push(props.assetId);

        emit BondRegistered(props.assetId, props.assetType, props.rating);
    }

    function updateAvailability(bytes32 assetId, uint256 newSupply) external onlyVault {
        require(_exists[assetId], "Bond not found");
        _bonds[assetId].availableSupply = newSupply;
        _bonds[assetId].availableForPortfolio = newSupply > 0;
        emit AvailabilityUpdated(assetId, newSupply);
    }

    function getBond(bytes32 assetId) external view returns (RatedBondProperties memory) {
        require(_exists[assetId], "Bond not found");
        return _bonds[assetId];
    }

    function getAvailableBonds() external view returns (RatedBondProperties[] memory) {
        uint256 count;
        for (uint256 i; i < bondIds.length; i++) {
            if (_bonds[bondIds[i]].availableForPortfolio) count++;
        }
        RatedBondProperties[] memory result = new RatedBondProperties[](count);
        uint256 idx;
        for (uint256 i; i < bondIds.length; i++) {
            if (_bonds[bondIds[i]].availableForPortfolio) {
                result[idx++] = _bonds[bondIds[i]];
            }
        }
        return result;
    }

    function getBondsByRatingRange(uint8 minScore, uint8 maxScore) external view returns (RatedBondProperties[] memory) {
        uint256 count;
        for (uint256 i; i < bondIds.length; i++) {
            uint8 s = _bonds[bondIds[i]].riskScore;
            if (s >= minScore && s <= maxScore) count++;
        }
        RatedBondProperties[] memory result = new RatedBondProperties[](count);
        uint256 idx;
        for (uint256 i; i < bondIds.length; i++) {
            uint8 s = _bonds[bondIds[i]].riskScore;
            if (s >= minScore && s <= maxScore) {
                result[idx++] = _bonds[bondIds[i]];
            }
        }
        return result;
    }

    function getAllBonds() external view returns (RatedBondProperties[] memory) {
        RatedBondProperties[] memory result = new RatedBondProperties[](bondIds.length);
        for (uint256 i; i < bondIds.length; i++) {
            result[i] = _bonds[bondIds[i]];
        }
        return result;
    }

    function getBondCount() external view returns (uint256) {
        return bondIds.length;
    }

    function setVaultContract(address _vault) external onlyOwner {
        require(_vault != address(0), "Invalid vault address");
        vaultContract = _vault;
    }

    function setAgentAddress(address _agent) external onlyOwner {
        require(_agent != address(0), "Invalid agent address");
        agentAddress = _agent;
    }
}
