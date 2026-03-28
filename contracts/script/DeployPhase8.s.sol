// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BondCatalog} from "../src/BondCatalog.sol";
import {PortfolioAttestation} from "../src/PortfolioAttestation.sol";
import {AIAttestationVerifier} from "../src/AIAttestationVerifier.sol";
import {FidezaLendingPool} from "../src/FidezaLendingPool.sol";

/// @title DeployPhase8
/// @notice Deploys Phase 8 public chain contracts: BondCatalog, PortfolioAttestation,
///         AIAttestationVerifier, FidezaLendingPool. Populates BondCatalog with all 12 instruments.
///
/// Usage:
///   source .env
///   forge script script/DeployPhase8.s.sol --rpc-url $PUBLIC_CHAIN_RPC_URL --broadcast --legacy
contract DeployPhase8 is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address agentAddress = vm.addr(deployerKey);

        console.log("=== Phase 8: Public Chain Deployment ===");
        console.log("  Deployer/Agent:", agentAddress);
        console.log("");

        vm.startBroadcast(deployerKey);

        // === 1. Deploy BondCatalog ===
        BondCatalog catalog = new BondCatalog();
        console.log("  BondCatalog:            ", address(catalog));

        // === 2. Populate BondCatalog with all 12 instruments ===
        _registerAllBonds(catalog);

        // === 3. Deploy PortfolioAttestation ===
        PortfolioAttestation attestation = new PortfolioAttestation(agentAddress);
        console.log("  PortfolioAttestation:   ", address(attestation));

        // === 4. Deploy AIAttestationVerifier ===
        AIAttestationVerifier verifier = new AIAttestationVerifier(address(attestation));
        console.log("  AIAttestationVerifier:  ", address(verifier));

        // === 5. Deploy FidezaLendingPool ===
        FidezaLendingPool pool = new FidezaLendingPool(address(verifier));
        console.log("  FidezaLendingPool:      ", address(pool));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Phase 8 Deployment Complete ===");
        console.log("  BondCatalog bonds registered:", catalog.getBondCount());
        console.log("");
        console.log("Add to your .env:");
        console.log("  BOND_CATALOG_ADDRESS=%s", vm.toString(address(catalog)));
        console.log("  PORTFOLIO_ATTESTATION_ADDRESS=%s", vm.toString(address(attestation)));
        console.log("  AI_ATTESTATION_VERIFIER_ADDRESS=%s", vm.toString(address(verifier)));
        console.log("  FIDEZA_LENDING_POOL_ADDRESS=%s", vm.toString(address(pool)));
    }

    function _registerAllBonds(BondCatalog catalog) internal {
        // #1: BOND-2026-ENERGY-A1 — BB+, Energy
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-2026-ENERGY-A1")),
            assetType: "BOND",
            rating: "BB+",
            couponRange: "3-6%",
            maturityBucket: "5-10 years",
            currency: "USD",
            issuerCategory: "BR Energy/Utilities, High Yield",
            hasCollateral: false,
            riskScore: 45
        }));
        console.log("    Registered: BOND-2026-ENERGY-A1");

        // #2: INV-2026-00847 — BBB+, Construction
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("INV-2026-00847")),
            assetType: "INVOICE",
            rating: "BBB+",
            couponRange: "0-3%",
            maturityBucket: "0-2 years",
            currency: "BRL",
            issuerCategory: "BR Construction, Investment Grade",
            hasCollateral: false,
            riskScore: 30
        }));
        console.log("    Registered: INV-2026-00847");

        // #3: ABS-2026-AUTO-001 — A, Auto Loans
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("ABS-2026-AUTO-001")),
            assetType: "ABS_TRANCHE",
            rating: "A",
            couponRange: "0-3%",
            maturityBucket: "2-5 years",
            currency: "BRL",
            issuerCategory: "BR Auto Loans, Investment Grade",
            hasCollateral: true,
            riskScore: 25
        }));
        console.log("    Registered: ABS-2026-AUTO-001");

        // #4: BOND-2026-TELCO-B1 — BBB, Telecom
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-2026-TELCO-B1")),
            assetType: "BOND",
            rating: "BBB",
            couponRange: "3-6%",
            maturityBucket: "2-5 years",
            currency: "USD",
            issuerCategory: "BR Telecom, Investment Grade",
            hasCollateral: false,
            riskScore: 35
        }));
        console.log("    Registered: BOND-2026-TELCO-B1");

        // #5: BOND-2026-INFRA-C1 — A-, Infrastructure
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-2026-INFRA-C1")),
            assetType: "BOND",
            rating: "A-",
            couponRange: "3-6%",
            maturityBucket: "5-10 years",
            currency: "BRL",
            issuerCategory: "BR Infrastructure, Investment Grade",
            hasCollateral: true,
            riskScore: 25
        }));
        console.log("    Registered: BOND-2026-INFRA-C1");

        // #6: INV-2026-01122 — BBB, Agriculture
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("INV-2026-01122")),
            assetType: "INVOICE",
            rating: "BBB",
            couponRange: "0-3%",
            maturityBucket: "0-2 years",
            currency: "BRL",
            issuerCategory: "BR Agriculture, Investment Grade",
            hasCollateral: false,
            riskScore: 35
        }));
        console.log("    Registered: INV-2026-01122");

        // #7: ABS-2026-MORT-001 — AA-, Mortgages
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("ABS-2026-MORT-001")),
            assetType: "ABS_TRANCHE",
            rating: "AA-",
            couponRange: "0-3%",
            maturityBucket: "5-10 years",
            currency: "BRL",
            issuerCategory: "BR Mortgages, Investment Grade",
            hasCollateral: true,
            riskScore: 12
        }));
        console.log("    Registered: ABS-2026-MORT-001");

        // #8: BOND-2026-BANK-D1 — BB, Banking
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-2026-BANK-D1")),
            assetType: "BOND",
            rating: "BB",
            couponRange: "6-10%",
            maturityBucket: "2-5 years",
            currency: "USD",
            issuerCategory: "BR Banking, High Yield",
            hasCollateral: false,
            riskScore: 50
        }));
        console.log("    Registered: BOND-2026-BANK-D1");

        // #9: INV-2026-01455 — A, Technology
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("INV-2026-01455")),
            assetType: "INVOICE",
            rating: "A",
            couponRange: "0-3%",
            maturityBucket: "0-2 years",
            currency: "BRL",
            issuerCategory: "BR Technology, Investment Grade",
            hasCollateral: false,
            riskScore: 20
        }));
        console.log("    Registered: INV-2026-01455");

        // #10: ABS-2026-CREDIT-001 — BBB+, Consumer Credit
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("ABS-2026-CREDIT-001")),
            assetType: "ABS_TRANCHE",
            rating: "BBB+",
            couponRange: "0-3%",
            maturityBucket: "2-5 years",
            currency: "BRL",
            issuerCategory: "BR Consumer Credit, Investment Grade",
            hasCollateral: true,
            riskScore: 30
        }));
        console.log("    Registered: ABS-2026-CREDIT-001");

        // #11: BOND-2026-MINING-E1 — B+, Mining
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-2026-MINING-E1")),
            assetType: "BOND",
            rating: "B+",
            couponRange: "6-10%",
            maturityBucket: "5-10 years",
            currency: "USD",
            issuerCategory: "BR Mining, High Yield",
            hasCollateral: true,
            riskScore: 60
        }));
        console.log("    Registered: BOND-2026-MINING-E1");

        // #12: BOND-2026-RETAIL-F1 — BBB-, Retail
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-2026-RETAIL-F1")),
            assetType: "BOND",
            rating: "BBB-",
            couponRange: "3-6%",
            maturityBucket: "2-5 years",
            currency: "BRL",
            issuerCategory: "BR Retail, Investment Grade",
            hasCollateral: false,
            riskScore: 40
        }));
        console.log("    Registered: BOND-2026-RETAIL-F1");
    }
}
