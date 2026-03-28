// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BondPropertyRegistry} from "./BondPropertyRegistry.sol";

/// @title PortfolioVault
/// @notice Holds actual bond tokens on Privacy Node. One contract manages multiple portfolios.
///         Composition is private (dark pool) — only aggregate properties are publicly visible.
contract PortfolioVault is Ownable {
    struct PortfolioHolding {
        bytes32 assetId;
        address bondToken;
        uint256 amount;
        uint256 weightBps; // 1500 = 15%
    }

    mapping(bytes32 => PortfolioHolding[]) private _holdings;
    mapping(bytes32 => uint256) public totalValues;
    mapping(bytes32 => bool) public portfolioExists;
    bytes32[] public portfolioIds;

    BondPropertyRegistry public registry;
    address public agentAddress;

    event PortfolioCreated(bytes32 indexed portfolioId, uint256 holdingCount, uint256 totalValue);

    constructor(address _registry, address _agentAddress) Ownable(msg.sender) {
        require(_registry != address(0), "Invalid registry");
        require(_agentAddress != address(0), "Invalid agent");
        registry = BondPropertyRegistry(_registry);
        agentAddress = _agentAddress;
    }

    modifier onlyOwnerOrAgent() {
        require(msg.sender == owner() || msg.sender == agentAddress, "Not authorized");
        _;
    }

    function createPortfolio(bytes32 portfolioId, PortfolioHolding[] calldata holdings) external onlyOwnerOrAgent {
        require(!portfolioExists[portfolioId], "Portfolio already exists");
        require(holdings.length > 0, "Empty portfolio");

        uint256 totalWeight;
        uint256 totalValue;

        for (uint256 i; i < holdings.length; i++) {
            PortfolioHolding calldata h = holdings[i];
            require(h.bondToken != address(0), "Invalid token");
            require(h.amount > 0, "Zero amount");

            // Transfer bond tokens into vault
            IERC20(h.bondToken).transferFrom(msg.sender, address(this), h.amount);

            // Update available supply in registry
            BondPropertyRegistry.RatedBondProperties memory bond = registry.getBond(h.assetId);
            uint256 newSupply = bond.availableSupply > h.amount ? bond.availableSupply - h.amount : 0;
            registry.updateAvailability(h.assetId, newSupply);

            // Compute value contribution
            totalValue += h.amount;
            totalWeight += h.weightBps;

            _holdings[portfolioId].push(h);
        }

        require(totalWeight == 10000, "Weights must sum to 10000");

        totalValues[portfolioId] = totalValue;
        portfolioExists[portfolioId] = true;
        portfolioIds.push(portfolioId);

        emit PortfolioCreated(portfolioId, holdings.length, totalValue);
    }

    /// @notice Full composition — PRIVATE, only owner or agent can read
    function getFullComposition(bytes32 portfolioId) external view onlyOwnerOrAgent returns (PortfolioHolding[] memory) {
        require(portfolioExists[portfolioId], "Portfolio not found");
        return _holdings[portfolioId];
    }

    /// @notice Aggregate properties — PUBLIC, reveals no composition details
    function getAggregateProperties(bytes32 portfolioId) external view returns (
        uint256 totalValue,
        uint256 holdingCount
    ) {
        require(portfolioExists[portfolioId], "Portfolio not found");
        return (totalValues[portfolioId], _holdings[portfolioId].length);
    }

    function getPortfolioCount() external view returns (uint256) {
        return portfolioIds.length;
    }

    function setAgentAddress(address _agent) external onlyOwner {
        require(_agent != address(0), "Invalid agent");
        agentAddress = _agent;
    }
}
