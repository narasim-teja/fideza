// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BondPropertyRegistry} from "../src/BondPropertyRegistry.sol";

/// @title DeployPhase6b
/// @notice Registers 9 additional instruments in BondPropertyRegistry for Phase 7.
///         Run AFTER MintAdditionalAssets.s.sol has deployed the 9 token contracts.
///
/// Prerequisites:
///   - BondPropertyRegistry deployed (Phase 6)
///   - 9 new token addresses in .env (from MintAdditionalAssets.s.sol output)
///
/// Usage:
///   source .env
///   forge script script/DeployPhase6b.s.sol --rpc-url $PRIVACY_NODE_RPC_URL --broadcast --legacy
contract DeployPhase6b is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        BondPropertyRegistry bondRegistry = BondPropertyRegistry(
            vm.envAddress("BOND_PROPERTY_REGISTRY_ADDRESS")
        );

        // Read new token addresses
        address bondTelco = vm.envAddress("BOND_TOKEN_TELCO_ADDRESS");
        address bondInfra = vm.envAddress("BOND_TOKEN_INFRA_ADDRESS");
        address bondBank = vm.envAddress("BOND_TOKEN_BANK_ADDRESS");
        address bondMining = vm.envAddress("BOND_TOKEN_MINING_ADDRESS");
        address bondRetail = vm.envAddress("BOND_TOKEN_RETAIL_ADDRESS");
        address invCargill = vm.envAddress("INVOICE_TOKEN_CARGILL_ADDRESS");
        address invTotvs = vm.envAddress("INVOICE_TOKEN_TOTVS_ADDRESS");
        address absMortgage = vm.envAddress("ABS_TOKEN_MORTGAGE_ADDRESS");
        address absCredit = vm.envAddress("ABS_TOKEN_CREDIT_ADDRESS");

        vm.startBroadcast(deployerKey);

        // #4: BOND-2026-TELCO-B1 — BBB, 425 bps, 2-5y, USD, Telecom
        bondRegistry.registerBond(BondPropertyRegistry.RatedBondProperties({
            assetId: keccak256(bytes("BOND-2026-TELCO-B1")),
            bondTokenAddress: bondTelco,
            assetType: "BOND",
            rating: "BBB",
            couponRateBps: 425,
            couponRange: "3-6%",
            maturityBucket: "2-5 years",
            maturityTimestamp: 1864425600,
            seniority: "senior-unsecured",
            currency: "USD",
            issuerCategory: "BR Telecom, Investment Grade",
            parValue: 1000,
            hasCollateral: false,
            riskScore: 35,
            complianceReportHash: keccak256("compliance-BOND-2026-TELCO-B1"),
            availableForPortfolio: true,
            availableSupply: 10_000 * 10 ** 18
        }));
        console.log("  Registered: BOND-2026-TELCO-B1 (BBB, 425bps)");

        // #5: BOND-2026-INFRA-C1 — A-, 350 bps, 5-10y, BRL, Infrastructure
        bondRegistry.registerBond(BondPropertyRegistry.RatedBondProperties({
            assetId: keccak256(bytes("BOND-2026-INFRA-C1")),
            bondTokenAddress: bondInfra,
            assetType: "BOND",
            rating: "A-",
            couponRateBps: 350,
            couponRange: "3-6%",
            maturityBucket: "5-10 years",
            maturityTimestamp: 1893456000,
            seniority: "senior-secured",
            currency: "BRL",
            issuerCategory: "BR Infrastructure, Investment Grade",
            parValue: 1000,
            hasCollateral: true,
            riskScore: 25,
            complianceReportHash: keccak256("compliance-BOND-2026-INFRA-C1"),
            availableForPortfolio: true,
            availableSupply: 10_000 * 10 ** 18
        }));
        console.log("  Registered: BOND-2026-INFRA-C1 (A-, 350bps)");

        // #6: INV-2026-01122 — BBB, 0 bps, 0-2y, BRL, Agriculture
        bondRegistry.registerBond(BondPropertyRegistry.RatedBondProperties({
            assetId: keccak256(bytes("INV-2026-01122")),
            bondTokenAddress: invCargill,
            assetType: "INVOICE",
            rating: "BBB",
            couponRateBps: 0,
            couponRange: "0-3%",
            maturityBucket: "0-2 years",
            maturityTimestamp: 1751328000,
            seniority: "senior",
            currency: "BRL",
            issuerCategory: "BR Agriculture, Investment Grade",
            parValue: 15_000_000,
            hasCollateral: false,
            riskScore: 35,
            complianceReportHash: keccak256("compliance-INV-2026-01122"),
            availableForPortfolio: true,
            availableSupply: 15_000_000 * 10 ** 18
        }));
        console.log("  Registered: INV-2026-01122 (BBB, 0bps)");

        // #7: ABS-2026-MORT-001 — AA-, 0 bps, 5-10y, BRL, Mortgages
        bondRegistry.registerBond(BondPropertyRegistry.RatedBondProperties({
            assetId: keccak256(bytes("ABS-2026-MORT-001")),
            bondTokenAddress: absMortgage,
            assetType: "ABS_TRANCHE",
            rating: "AA-",
            couponRateBps: 0,
            couponRange: "0-3%",
            maturityBucket: "5-10 years",
            maturityTimestamp: 1924905600,
            seniority: "senior",
            currency: "BRL",
            issuerCategory: "BR Mortgages, Investment Grade",
            parValue: 132_000_000,
            hasCollateral: true,
            riskScore: 12,
            complianceReportHash: keccak256("compliance-ABS-2026-MORT-001"),
            availableForPortfolio: true,
            availableSupply: 20_000 * 10 ** 18
        }));
        console.log("  Registered: ABS-2026-MORT-001 (AA-, 0bps)");

        // #8: BOND-2026-BANK-D1 — BB, 650 bps, 2-5y, USD, Banking
        bondRegistry.registerBond(BondPropertyRegistry.RatedBondProperties({
            assetId: keccak256(bytes("BOND-2026-BANK-D1")),
            bondTokenAddress: bondBank,
            assetType: "BOND",
            rating: "BB",
            couponRateBps: 650,
            couponRange: "6-10%",
            maturityBucket: "2-5 years",
            maturityTimestamp: 1867104000,
            seniority: "subordinated",
            currency: "USD",
            issuerCategory: "BR Banking, High Yield",
            parValue: 1000,
            hasCollateral: false,
            riskScore: 50,
            complianceReportHash: keccak256("compliance-BOND-2026-BANK-D1"),
            availableForPortfolio: true,
            availableSupply: 10_000 * 10 ** 18
        }));
        console.log("  Registered: BOND-2026-BANK-D1 (BB, 650bps)");

        // #9: INV-2026-01455 — A, 0 bps, 0-2y, BRL, Technology
        bondRegistry.registerBond(BondPropertyRegistry.RatedBondProperties({
            assetId: keccak256(bytes("INV-2026-01455")),
            bondTokenAddress: invTotvs,
            assetType: "INVOICE",
            rating: "A",
            couponRateBps: 0,
            couponRange: "0-3%",
            maturityBucket: "0-2 years",
            maturityTimestamp: 1753920000,
            seniority: "senior",
            currency: "BRL",
            issuerCategory: "BR Technology, Investment Grade",
            parValue: 8_000_000,
            hasCollateral: false,
            riskScore: 20,
            complianceReportHash: keccak256("compliance-INV-2026-01455"),
            availableForPortfolio: true,
            availableSupply: 8_000_000 * 10 ** 18
        }));
        console.log("  Registered: INV-2026-01455 (A, 0bps)");

        // #10: ABS-2026-CREDIT-001 — BBB+, 0 bps, 2-5y, BRL, Consumer Credit
        bondRegistry.registerBond(BondPropertyRegistry.RatedBondProperties({
            assetId: keccak256(bytes("ABS-2026-CREDIT-001")),
            bondTokenAddress: absCredit,
            assetType: "ABS_TRANCHE",
            rating: "BBB+",
            couponRateBps: 0,
            couponRange: "0-3%",
            maturityBucket: "2-5 years",
            maturityTimestamp: 1869782400,
            seniority: "senior",
            currency: "BRL",
            issuerCategory: "BR Consumer Credit, Investment Grade",
            parValue: 33_600_000,
            hasCollateral: true,
            riskScore: 30,
            complianceReportHash: keccak256("compliance-ABS-2026-CREDIT-001"),
            availableForPortfolio: true,
            availableSupply: 12_000 * 10 ** 18
        }));
        console.log("  Registered: ABS-2026-CREDIT-001 (BBB+, 0bps)");

        // #11: BOND-2026-MINING-E1 — B+, 825 bps, 5-10y, USD, Mining
        bondRegistry.registerBond(BondPropertyRegistry.RatedBondProperties({
            assetId: keccak256(bytes("BOND-2026-MINING-E1")),
            bondTokenAddress: bondMining,
            assetType: "BOND",
            rating: "B+",
            couponRateBps: 825,
            couponRange: "6-10%",
            maturityBucket: "5-10 years",
            maturityTimestamp: 1924905600,
            seniority: "senior-secured",
            currency: "USD",
            issuerCategory: "BR Mining, High Yield",
            parValue: 1000,
            hasCollateral: true,
            riskScore: 60,
            complianceReportHash: keccak256("compliance-BOND-2026-MINING-E1"),
            availableForPortfolio: true,
            availableSupply: 10_000 * 10 ** 18
        }));
        console.log("  Registered: BOND-2026-MINING-E1 (B+, 825bps)");

        // #12: BOND-2026-RETAIL-F1 — BBB-, 500 bps, 2-5y, BRL, Retail
        bondRegistry.registerBond(BondPropertyRegistry.RatedBondProperties({
            assetId: keccak256(bytes("BOND-2026-RETAIL-F1")),
            bondTokenAddress: bondRetail,
            assetType: "BOND",
            rating: "BBB-",
            couponRateBps: 500,
            couponRange: "3-6%",
            maturityBucket: "2-5 years",
            maturityTimestamp: 1869782400,
            seniority: "senior-unsecured",
            currency: "BRL",
            issuerCategory: "BR Retail, Investment Grade",
            parValue: 1000,
            hasCollateral: false,
            riskScore: 40,
            complianceReportHash: keccak256("compliance-BOND-2026-RETAIL-F1"),
            availableForPortfolio: true,
            availableSupply: 10_000 * 10 ** 18
        }));
        console.log("  Registered: BOND-2026-RETAIL-F1 (BBB-, 500bps)");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Phase 6b Registration Complete ===");
        console.log("  9 new instruments registered in BondPropertyRegistry");
        console.log("  Total instruments: 12 (3 existing + 9 new)");
        console.log("");
        console.log("Next steps:");
        console.log("  1. Register each token via Rayls API (POST /api/user/tokens + PATCH /api/operator/tokens/status)");
        console.log("  2. Run portfolio agent: npx tsx src/index.ts --mode portfolio --constraints '{...}'");
    }
}
