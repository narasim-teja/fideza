// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BondPropertyRegistry} from "../src/BondPropertyRegistry.sol";
import {PortfolioVault} from "../src/PortfolioVault.sol";

/// @title Phase6Test
/// @notice Tests portfolio creation: approves bond tokens, creates portfolio, verifies state.
///
/// Prerequisites: Phase 6 contracts deployed, addresses set in .env
///
/// Usage:
///   source .env
///   forge script script/Phase6Test.s.sol --rpc-url $PRIVACY_NODE_RPC_URL --broadcast --legacy
contract Phase6Test is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        address bondToken = vm.envAddress("BOND_TOKEN_ADDRESS");
        address absToken = vm.envAddress("ABS_TOKEN_ADDRESS");
        address vaultAddr = vm.envAddress("PORTFOLIO_VAULT_ADDRESS");
        address registryAddr = vm.envAddress("BOND_PROPERTY_REGISTRY_ADDRESS");

        BondPropertyRegistry registry = BondPropertyRegistry(registryAddr);
        PortfolioVault vault = PortfolioVault(vaultAddr);

        bytes32 bondAssetId = keccak256(bytes("BOND-2026-ENERGY-A1"));
        bytes32 absAssetId = keccak256(bytes("ABS-2026-AUTO-001"));
        bytes32 portfolioId = keccak256(bytes("PORTFOLIO-001"));

        console.log("=== Phase 6 Test: Portfolio Creation ===");
        console.log("");

        // Check pre-state
        console.log("--- Pre-state ---");
        BondPropertyRegistry.RatedBondProperties memory bondPre = registry.getBond(bondAssetId);
        BondPropertyRegistry.RatedBondProperties memory absPre = registry.getBond(absAssetId);
        console.log("  Bond available supply:", bondPre.availableSupply);
        console.log("  ABS available supply: ", absPre.availableSupply);
        console.log("  Registry bond count:  ", registry.getBondCount());

        vm.startBroadcast(deployerKey);

        // Approve bond tokens to vault
        uint256 bondAmount = 2000 * 10 ** 18;
        uint256 absAmount = 1000 * 10 ** 18;

        IERC20(bondToken).approve(vaultAddr, bondAmount);
        console.log("  Approved BondToken:", bondAmount);

        IERC20(absToken).approve(vaultAddr, absAmount);
        console.log("  Approved ABSToken: ", absAmount);

        // Create portfolio with 2 holdings
        PortfolioVault.PortfolioHolding[] memory holdings = new PortfolioVault.PortfolioHolding[](2);
        holdings[0] = PortfolioVault.PortfolioHolding({
            assetId: bondAssetId,
            bondToken: bondToken,
            amount: bondAmount,
            weightBps: 6667 // 66.67%
        });
        holdings[1] = PortfolioVault.PortfolioHolding({
            assetId: absAssetId,
            bondToken: absToken,
            amount: absAmount,
            weightBps: 3333 // 33.33%
        });

        vault.createPortfolio(portfolioId, holdings);
        console.log("  Portfolio created: PORTFOLIO-001");

        vm.stopBroadcast();

        // Verify post-state
        console.log("");
        console.log("--- Post-state ---");

        (uint256 totalValue, uint256 holdingCount) = vault.getAggregateProperties(portfolioId);
        console.log("  Portfolio total value:  ", totalValue);
        console.log("  Portfolio holding count:", holdingCount);
        console.log("  Portfolio exists:       ", vault.portfolioExists(portfolioId));

        BondPropertyRegistry.RatedBondProperties memory bondPost = registry.getBond(bondAssetId);
        BondPropertyRegistry.RatedBondProperties memory absPost = registry.getBond(absAssetId);
        console.log("  Bond available supply:  ", bondPost.availableSupply);
        console.log("  ABS available supply:   ", absPost.availableSupply);

        console.log("");
        console.log("=== Phase 6 Test Complete ===");
    }
}
