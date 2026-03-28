// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IDeploymentProxyRegistryV1} from "rayls-protocol-sdk/interfaces/IDeploymentProxyRegistryV1.sol";
import {BondPropertyRegistry} from "../src/BondPropertyRegistry.sol";
import {PortfolioVault} from "../src/PortfolioVault.sol";
import {VaultShareToken} from "../src/VaultShareToken.sol";

/// @title DeployPhase6
/// @notice Deploys vault infrastructure on Privacy Node + populates registry with 3 rated bonds.
///
/// Usage:
///   source .env
///   forge script script/DeployPhase6.s.sol --rpc-url $PRIVACY_NODE_RPC_URL --broadcast --legacy
contract DeployPhase6 is Script {
    function run() external {
        address registryAddr = vm.envAddress("DEPLOYMENT_PROXY_REGISTRY");
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployerAddr = vm.addr(deployerKey);

        // Existing token addresses from Phase 1
        address invoiceToken = vm.envAddress("INVOICE_TOKEN_ADDRESS");
        address bondToken = vm.envAddress("BOND_TOKEN_ADDRESS");
        address absToken = vm.envAddress("ABS_TOKEN_ADDRESS");
        // Discover Rayls infrastructure
        IDeploymentProxyRegistryV1 proxyRegistry = IDeploymentProxyRegistryV1(registryAddr);
        address endpoint = proxyRegistry.getContract("Endpoint");
        address rnEndpoint = proxyRegistry.getContract("RNEndpoint");
        address userGovernance = proxyRegistry.getContract("RNUserGovernance");

        require(endpoint != address(0), "Endpoint not found");
        require(rnEndpoint != address(0), "RNEndpoint not found");
        require(userGovernance != address(0), "RNUserGovernance not found");

        console.log("=== Rayls Infrastructure ===");
        console.log("  Endpoint:        ", endpoint);
        console.log("  RNEndpoint:      ", rnEndpoint);
        console.log("  RNUserGovernance:", userGovernance);
        console.log("");

        vm.startBroadcast(deployerKey);

        // === 1. Deploy BondPropertyRegistry ===
        BondPropertyRegistry bondRegistry = new BondPropertyRegistry(deployerAddr);
        console.log("  BondPropertyRegistry:", address(bondRegistry));

        // === 2. Deploy PortfolioVault ===
        PortfolioVault vault = new PortfolioVault(address(bondRegistry), deployerAddr);
        console.log("  PortfolioVault:      ", address(vault));

        // === 3. Wire vault into registry ===
        bondRegistry.setVaultContract(address(vault));
        console.log("  VaultContract set on registry");

        // === 4. Populate registry with 3 rated bonds ===

        // Bond: BOND-2026-ENERGY-A1
        bytes32 bondAssetId = keccak256(bytes("BOND-2026-ENERGY-A1"));
        bondRegistry.registerBond(BondPropertyRegistry.RatedBondProperties({
            assetId: bondAssetId,
            bondTokenAddress: bondToken,
            assetType: "BOND",
            rating: "BB+",
            couponRateBps: 575,
            couponRange: "3-6%",
            maturityBucket: "5-10 years",
            maturityTimestamp: 1894665600,
            seniority: "senior-unsecured",
            currency: "USD",
            issuerCategory: "BR Energy/Utilities, High Yield",
            parValue: 1000,
            hasCollateral: false,
            riskScore: 45,
            complianceReportHash: keccak256("compliance-BOND-2026-ENERGY-A1"),
            availableForPortfolio: true,
            availableSupply: 10_000 * 10 ** 18
        }));
        console.log("  Registered: BOND-2026-ENERGY-A1");

        // Invoice: INV-2026-00847
        bytes32 invoiceAssetId = keccak256(bytes("INV-2026-00847"));
        bondRegistry.registerBond(BondPropertyRegistry.RatedBondProperties({
            assetId: invoiceAssetId,
            bondTokenAddress: invoiceToken,
            assetType: "INVOICE",
            rating: "BBB+",
            couponRateBps: 0,
            couponRange: "0-3%",
            maturityBucket: "0-2 years",
            maturityTimestamp: 1748563200,
            seniority: "senior",
            currency: "BRL",
            issuerCategory: "BR Construction, Investment Grade",
            parValue: 25_000_000,
            hasCollateral: false,
            riskScore: 30,
            complianceReportHash: keccak256("compliance-INV-2026-00847"),
            availableForPortfolio: true,
            availableSupply: 25_000_000 * 10 ** 18
        }));
        console.log("  Registered: INV-2026-00847");

        // ABS: ABS-2026-AUTO-001
        bytes32 absAssetId = keccak256(bytes("ABS-2026-AUTO-001"));
        bondRegistry.registerBond(BondPropertyRegistry.RatedBondProperties({
            assetId: absAssetId,
            bondTokenAddress: absToken,
            assetType: "ABS_TRANCHE",
            rating: "A",
            couponRateBps: 0,
            couponRange: "0-3%",
            maturityBucket: "2-5 years",
            maturityTimestamp: 1869436800,
            seniority: "senior",
            currency: "BRL",
            issuerCategory: "BR Auto Loans, Investment Grade",
            parValue: 14_800_000,
            hasCollateral: true,
            riskScore: 25,
            complianceReportHash: keccak256("compliance-ABS-2026-AUTO-001"),
            availableForPortfolio: true,
            availableSupply: 14_800 * 10 ** 18
        }));
        console.log("  Registered: ABS-2026-AUTO-001");

        // === 5. Deploy VaultShareToken for test portfolio ===
        bytes32 portfolioId = keccak256(bytes("PORTFOLIO-001"));
        VaultShareToken shareToken = new VaultShareToken(
            "Fideza Portfolio Share - P001",
            "FPS-P001",
            portfolioId,
            1000 * 10 ** 18,
            endpoint,
            rnEndpoint,
            userGovernance
        );
        console.log("  VaultShareToken:     ", address(shareToken));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Phase 6 Deployment Complete ===");
        console.log("Update .env with these addresses:");
        console.log("  BOND_PROPERTY_REGISTRY_ADDRESS=", vm.toString(address(bondRegistry)));
        console.log("  PORTFOLIO_VAULT_ADDRESS=", vm.toString(address(vault)));
        console.log("  VAULT_SHARE_TOKEN_ADDRESS=", vm.toString(address(shareToken)));
        console.log("");
        console.log("Next: Register VaultShareToken via API, then run Phase6Test.s.sol");
    }
}
