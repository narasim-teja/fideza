// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {BondCatalog} from "../src/BondCatalog.sol";

/// @title SeedBondCatalog
/// @notice Deploys a fresh BondCatalog and seeds it with 12 Brazilian corporate bonds.
///
/// Usage:
///   source .env
///   forge script script/SeedBondCatalog.s.sol --rpc-url $PUBLIC_CHAIN_RPC_URL --broadcast --legacy
contract SeedBondCatalog is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("=== SeedBondCatalog ===");
        console.log("  Deployer:", deployer);

        vm.startBroadcast(deployerKey);

        BondCatalog catalog = new BondCatalog();
        console.log("  BondCatalog deployed:", address(catalog));

        // --- 12 Brazilian Corporate Bonds ---

        // #1 BB+ Energy — high yield, no collateral
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-BR-PETRO-2028")),
            assetType: "BOND",
            rating: "BB+",
            couponRange: "8.25%",
            maturityBucket: "3 years",
            currency: "USD",
            issuerCategory: "BR Energy",
            hasCollateral: false,
            riskScore: 55
        }));

        // #2 BBB Telecom — low investment grade
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-BR-TELCO-2029")),
            assetType: "BOND",
            rating: "BBB",
            couponRange: "5.75%",
            maturityBucket: "4 years",
            currency: "USD",
            issuerCategory: "BR Telecom",
            hasCollateral: false,
            riskScore: 68
        }));

        // #3 A- Infrastructure — solid IG, collateralized
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-BR-INFRA-2031")),
            assetType: "BOND",
            rating: "A-",
            couponRange: "4.50%",
            maturityBucket: "6 years",
            currency: "BRL",
            issuerCategory: "BR Infrastructure",
            hasCollateral: true,
            riskScore: 80
        }));

        // #4 BB Banking — high yield
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-BR-BANK-2027")),
            assetType: "BOND",
            rating: "BB",
            couponRange: "9.00%",
            maturityBucket: "2 years",
            currency: "USD",
            issuerCategory: "BR Banking",
            hasCollateral: false,
            riskScore: 48
        }));

        // #5 B+ Mining — deep high yield, collateralized
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-BR-MINING-2033")),
            assetType: "BOND",
            rating: "B+",
            couponRange: "11.50%",
            maturityBucket: "8 years",
            currency: "USD",
            issuerCategory: "BR Mining",
            hasCollateral: true,
            riskScore: 38
        }));

        // #6 BBB- Retail — borderline IG
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-BR-RETAIL-2028")),
            assetType: "BOND",
            rating: "BBB-",
            couponRange: "6.00%",
            maturityBucket: "3 years",
            currency: "BRL",
            issuerCategory: "BR Retail",
            hasCollateral: false,
            riskScore: 62
        }));

        // #7 A Agribusiness — strong IG, collateralized
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-BR-AGRO-2030")),
            assetType: "BOND",
            rating: "A",
            couponRange: "3.75%",
            maturityBucket: "5 years",
            currency: "BRL",
            issuerCategory: "BR Agribusiness",
            hasCollateral: true,
            riskScore: 78
        }));

        // #8 BB- Construction — high yield, short term
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-BR-CONSTR-2027")),
            assetType: "BOND",
            rating: "BB-",
            couponRange: "10.25%",
            maturityBucket: "1.5 years",
            currency: "BRL",
            issuerCategory: "BR Construction",
            hasCollateral: false,
            riskScore: 42
        }));

        // #9 BBB+ Healthcare — mid IG, collateralized
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-BR-HEALTH-2029")),
            assetType: "BOND",
            rating: "BBB+",
            couponRange: "5.00%",
            maturityBucket: "4 years",
            currency: "BRL",
            issuerCategory: "BR Healthcare",
            hasCollateral: true,
            riskScore: 72
        }));

        // #10 A+ Logistics — high IG, collateralized
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-BR-LOGIST-2030")),
            assetType: "BOND",
            rating: "A+",
            couponRange: "3.25%",
            maturityBucket: "5 years",
            currency: "USD",
            issuerCategory: "BR Logistics",
            hasCollateral: true,
            riskScore: 85
        }));

        // #11 BB+ Sugar/Ethanol — high yield
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-BR-SUGAR-2028")),
            assetType: "BOND",
            rating: "BB+",
            couponRange: "7.75%",
            maturityBucket: "3 years",
            currency: "BRL",
            issuerCategory: "BR Sugar/Ethanol",
            hasCollateral: false,
            riskScore: 52
        }));

        // #12 B Fintech — deepest high yield
        catalog.registerBond(BondCatalog.PublicBondInfo({
            assetId: keccak256(bytes("BOND-BR-FINTECH-2027")),
            assetType: "BOND",
            rating: "B",
            couponRange: "12.50%",
            maturityBucket: "2 years",
            currency: "USD",
            issuerCategory: "BR Fintech",
            hasCollateral: false,
            riskScore: 35
        }));

        vm.stopBroadcast();

        console.log("");
        console.log("  Bonds registered:", catalog.getBondCount());
        console.log("");
        console.log("Update VAULT_CONTRACTS.bondCatalog in client/src/lib/contracts.ts:");
        console.log("  bondCatalog: \"%s\"", vm.toString(address(catalog)));
    }
}
