// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {InstitutionRegistry} from "../src/InstitutionRegistry.sol";
import {InvoiceToken} from "../src/InvoiceToken.sol";
import {BondToken} from "../src/BondToken.sol";
import {ABSToken} from "../src/ABSToken.sol";

/// @title MintSampleAssets
/// @notice Registers a sample institution and mints 3 sample assets with realistic mock data.
///
/// Prerequisites: Phase 1 contracts deployed, addresses set in .env
///
/// Usage:
///   source .env
///   forge script script/MintSampleAssets.s.sol --rpc-url $PRIVACY_NODE_RPC_URL --broadcast --legacy
contract MintSampleAssets is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployerAddr = vm.addr(deployerKey);

        InstitutionRegistry instReg = InstitutionRegistry(vm.envAddress("INSTITUTION_REGISTRY_ADDRESS"));
        InvoiceToken invoiceToken = InvoiceToken(vm.envAddress("INVOICE_TOKEN_ADDRESS"));
        BondToken bondToken = BondToken(vm.envAddress("BOND_TOKEN_ADDRESS"));
        ABSToken absToken = ABSToken(vm.envAddress("ABS_TOKEN_ADDRESS"));

        vm.startBroadcast(deployerKey);

        // === 1. Register & approve institution ===
        console.log("=== Registering Institution ===");
        instReg.registerInstitution(
            "Fideza Capital Partners",
            "CNPJ-12.345.678/0001-90",
            "BR",
            "Investment Bank",
            keccak256("kyb-doc-fideza-capital-2026")
        );
        instReg.updateStatus(deployerAddr, InstitutionRegistry.InstitutionStatus.APPROVED);
        console.log("  Institution registered and approved");

        // === 2. Initialize Invoice (INV-2026-00847) ===
        console.log("=== Initializing Invoice ===");
        invoiceToken.initializeInvoice(
            InvoiceToken.InvoiceMetadata({
                invoiceId: "INV-2026-00847",
                issuer: deployerAddr,
                debtorName: "Construtora Andrade Gutierrez S.A.",
                debtorJurisdiction: "BR",
                debtorCreditRating: "BBB+",
                debtorIndustry: "Construction",
                faceValue: 25_000_000e18,
                currency: "BRL",
                issueDate: 1740787200,  // 2026-03-01
                dueDate: 1748563200,    // 2026-05-30
                paymentTerms: "Net 90",
                recourseType: "limited",
                priorityClaim: false,
                invoiceDocHash: keccak256("invoice-pdf-INV-2026-00847"),
                previouslyTokenized: false
            }),
            25_000_000 * 10 ** 18 // 25M units (1 unit = R$1 face value)
        );
        console.log("  Invoice initialized, 25M units minted");

        // === 3. Initialize Bond (BOND-2026-ENERGY-A1) ===
        console.log("=== Initializing Bond ===");
        bondToken.initializeBond(
            BondToken.BondMetadata({
                bondId: "BOND-2026-ENERGY-A1",
                isin: "BRENRG26A01",
                issuer: deployerAddr,
                issuerName: "Eletrobras S.A.",
                issuerJurisdiction: "BR",
                issuerSector: "Energy/Utilities",
                issuerCreditRating: "BB+",
                parValue: 1000,
                currency: "USD",
                couponRateBps: 575,
                couponFrequency: "semi-annual",
                issueDate: 1736899200,     // 2026-01-15
                maturityDate: 1894665600,  // 2031-01-15
                seniority: "senior-unsecured",
                collateralType: "",
                covenantSummary: "Standard negative pledge. Debt-to-EBITDA not to exceed 4.0x. Change of control put at 101.",
                callProvision: "Callable at par after 3 years",
                offeringType: "144A",
                minimumDenomination: 200_000,
                qualifiedBuyerOnly: true,
                termSheetHash: keccak256("term-sheet-BOND-2026-ENERGY-A1")
            }),
            10_000 * 10 ** 18 // 10,000 bond units
        );
        console.log("  Bond initialized, 10000 units minted");

        // === 4. Initialize ABS (ABS-2026-AUTO-001) ===
        console.log("=== Initializing ABS ===");
        ABSToken.LoanData[] memory loans = new ABSToken.LoanData[](10);
        loans[0] = ABSToken.LoanData("AL-001", "SP", 715, 85000e18, 1250, 36, 0);
        loans[1] = ABSToken.LoanData("AL-002", "RJ", 680, 62000e18, 1400, 48, 0);
        loans[2] = ABSToken.LoanData("AL-003", "SP", 740, 95000e18, 1100, 24, 0);
        loans[3] = ABSToken.LoanData("AL-004", "MG", 695, 71000e18, 1350, 36, 0);
        loans[4] = ABSToken.LoanData("AL-005", "SP", 720, 88000e18, 1200, 48, 0);
        loans[5] = ABSToken.LoanData("AL-006", "RJ", 660, 54000e18, 1500, 36, 1); // 30d delinquent
        loans[6] = ABSToken.LoanData("AL-007", "BA", 705, 78000e18, 1300, 24, 0);
        loans[7] = ABSToken.LoanData("AL-008", "SP", 730, 92000e18, 1150, 48, 0);
        loans[8] = ABSToken.LoanData("AL-009", "PR", 690, 67000e18, 1380, 36, 0);
        loans[9] = ABSToken.LoanData("AL-010", "SP", 710, 83000e18, 1250, 24, 0);

        absToken.initializeABS(
            ABSToken.ABSMetadata({
                absId: "ABS-2026-AUTO-001",
                issuer: deployerAddr,
                poolType: "auto-loans",
                totalPoolSize: 247,
                totalPoolNotional: 18_500_000e18,
                trancheName: "Class A Senior",
                trancheSeniority: "senior",
                trancheSize: 14_800_000e18,
                creditEnhancementBps: 1550,
                subordinationLevelBps: 2000,
                currency: "BRL",
                expectedMaturity: 1869436800, // 2029-03-28
                servicerName: "Banco Itau Unibanco",
                auditorName: "PricewaterhouseCoopers",
                offeringCircularHash: keccak256("offering-circular-ABS-2026-AUTO-001"),
                poolTapeHash: keccak256("pool-tape-ABS-2026-AUTO-001")
            }),
            loans,
            14_800 * 10 ** 18 // tranche units
        );
        console.log("  ABS initialized, 14800 tranche units minted, 10 loans stored");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Sample Assets Minted ===");
        console.log("  Invoice: 25,000,000 units (INV-2026-00847)");
        console.log("  Bond: 10,000 units (BOND-2026-ENERGY-A1)");
        console.log("  ABS: 14,800 units (ABS-2026-AUTO-001)");
    }
}
