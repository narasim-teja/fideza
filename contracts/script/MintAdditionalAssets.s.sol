// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {IDeploymentProxyRegistryV1} from "rayls-protocol-sdk/interfaces/IDeploymentProxyRegistryV1.sol";
import {InstitutionRegistry} from "../src/InstitutionRegistry.sol";
import {BondToken} from "../src/BondToken.sol";
import {InvoiceToken} from "../src/InvoiceToken.sol";
import {ABSToken} from "../src/ABSToken.sol";

/// @title MintAdditionalAssets
/// @notice Deploys 9 additional token contracts for Phase 7 (12-instrument universe).
///
/// Usage:
///   source .env
///   forge script script/MintAdditionalAssets.s.sol --rpc-url $PRIVACY_NODE_RPC_URL --broadcast --legacy
contract MintAdditionalAssets is Script {
    // Shared state set in run(), read by helpers
    address internal _endpoint;
    address internal _rnEndpoint;
    address internal _userGovernance;
    address internal _instReg;
    address internal _deployer;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        _deployer = vm.addr(deployerKey);

        // Discover Rayls infrastructure
        IDeploymentProxyRegistryV1 proxyRegistry = IDeploymentProxyRegistryV1(
            vm.envAddress("DEPLOYMENT_PROXY_REGISTRY")
        );
        _endpoint = proxyRegistry.getContract("Endpoint");
        _rnEndpoint = proxyRegistry.getContract("RNEndpoint");
        _userGovernance = proxyRegistry.getContract("RNUserGovernance");
        _instReg = vm.envAddress("INSTITUTION_REGISTRY_ADDRESS");

        require(_endpoint != address(0), "Endpoint not found");
        require(_rnEndpoint != address(0), "RNEndpoint not found");
        require(_userGovernance != address(0), "UserGovernance not found");

        console.log("=== Deploying 9 Additional Tokens ===");
        console.log("  Deployer:", _deployer);

        vm.startBroadcast(deployerKey);

        // Deploy all 9 in separate functions to avoid stack-too-deep
        address bondTelco = _deployBondTelco();
        address bondInfra = _deployBondInfra();
        address bondBank = _deployBondBank();
        address bondMining = _deployBondMining();
        address bondRetail = _deployBondRetail();
        address invCargill = _deployInvCargill();
        address invTotvs = _deployInvTotvs();
        address absMortgage = _deployAbsMortgage();
        address absCredit = _deployAbsCredit();

        vm.stopBroadcast();

        console.log("");
        console.log("=== Phase 7 Token Deployment Complete ===");
        console.log("Add these to .env:");
        console.log("  BOND_TOKEN_TELCO_ADDRESS=", vm.toString(bondTelco));
        console.log("  BOND_TOKEN_INFRA_ADDRESS=", vm.toString(bondInfra));
        console.log("  BOND_TOKEN_BANK_ADDRESS=", vm.toString(bondBank));
        console.log("  BOND_TOKEN_MINING_ADDRESS=", vm.toString(bondMining));
        console.log("  BOND_TOKEN_RETAIL_ADDRESS=", vm.toString(bondRetail));
        console.log("  INVOICE_TOKEN_CARGILL_ADDRESS=", vm.toString(invCargill));
        console.log("  INVOICE_TOKEN_TOTVS_ADDRESS=", vm.toString(invTotvs));
        console.log("  ABS_TOKEN_MORTGAGE_ADDRESS=", vm.toString(absMortgage));
        console.log("  ABS_TOKEN_CREDIT_ADDRESS=", vm.toString(absCredit));
        console.log("");
        console.log("Next: Run DeployPhase6b.s.sol to register in BondPropertyRegistry");
    }

    // =================================================================
    // Bond deployments
    // =================================================================

    function _deployBondTelco() internal returns (address) {
        BondToken token = new BondToken(
            "Fideza Bond - TELCO B1", "FBOND-TB1",
            _endpoint, _rnEndpoint, _userGovernance, _instReg
        );
        token.initializeBond(
            BondToken.BondMetadata({
                bondId: "BOND-2026-TELCO-B1",
                isin: "BRTELC26B01",
                issuer: _deployer,
                issuerName: "Telefonica Vivo S.A.",
                issuerJurisdiction: "BR",
                issuerSector: "Telecom",
                issuerCreditRating: "BBB",
                parValue: 1000,
                currency: "USD",
                couponRateBps: 425,
                couponFrequency: "semi-annual",
                issueDate: 1738368000,
                maturityDate: 1864425600,
                seniority: "senior-unsecured",
                collateralType: "",
                covenantSummary: "Standard negative pledge. Net leverage max 3.5x. Restricted payments.",
                callProvision: "Non-callable 2y, then callable at 102",
                offeringType: "144A",
                minimumDenomination: 150_000,
                qualifiedBuyerOnly: true,
                termSheetHash: keccak256("term-sheet-BOND-2026-TELCO-B1")
            }),
            10_000 * 10 ** 18
        );
        console.log("  BOND-2026-TELCO-B1:", address(token));
        return address(token);
    }

    function _deployBondInfra() internal returns (address) {
        BondToken token = new BondToken(
            "Fideza Bond - INFRA C1", "FBOND-IC1",
            _endpoint, _rnEndpoint, _userGovernance, _instReg
        );
        token.initializeBond(
            BondToken.BondMetadata({
                bondId: "BOND-2026-INFRA-C1",
                isin: "BRINFR26C01",
                issuer: _deployer,
                issuerName: "CCR S.A.",
                issuerJurisdiction: "BR",
                issuerSector: "Infrastructure",
                issuerCreditRating: "A-",
                parValue: 1000,
                currency: "BRL",
                couponRateBps: 350,
                couponFrequency: "quarterly",
                issueDate: 1735689600,
                maturityDate: 1893456000,
                seniority: "senior-secured",
                collateralType: "Toll road concession rights and revenue pledge",
                covenantSummary: "DSCR min 1.3x. Reserve fund 6mo. Asset maintenance covenant.",
                callProvision: "Callable at par after 5 years",
                offeringType: "Reg S",
                minimumDenomination: 100_000,
                qualifiedBuyerOnly: false,
                termSheetHash: keccak256("term-sheet-BOND-2026-INFRA-C1")
            }),
            10_000 * 10 ** 18
        );
        console.log("  BOND-2026-INFRA-C1:", address(token));
        return address(token);
    }

    function _deployBondBank() internal returns (address) {
        BondToken token = new BondToken(
            "Fideza Bond - BANK D1", "FBOND-BD1",
            _endpoint, _rnEndpoint, _userGovernance, _instReg
        );
        token.initializeBond(
            BondToken.BondMetadata({
                bondId: "BOND-2026-BANK-D1",
                isin: "BRBANK26D01",
                issuer: _deployer,
                issuerName: "Banco do Brasil S.A.",
                issuerJurisdiction: "BR",
                issuerSector: "Banking",
                issuerCreditRating: "BB",
                parValue: 1000,
                currency: "USD",
                couponRateBps: 650,
                couponFrequency: "semi-annual",
                issueDate: 1740787200,
                maturityDate: 1867104000,
                seniority: "subordinated",
                collateralType: "",
                covenantSummary: "Tier 2 subordinated. Write-down at CET1 < 5.125%. No restrictive covenants.",
                callProvision: "Callable at par after 3y with regulatory approval",
                offeringType: "144A",
                minimumDenomination: 200_000,
                qualifiedBuyerOnly: true,
                termSheetHash: keccak256("term-sheet-BOND-2026-BANK-D1")
            }),
            10_000 * 10 ** 18
        );
        console.log("  BOND-2026-BANK-D1:", address(token));
        return address(token);
    }

    function _deployBondMining() internal returns (address) {
        BondToken token = new BondToken(
            "Fideza Bond - MINING E1", "FBOND-ME1",
            _endpoint, _rnEndpoint, _userGovernance, _instReg
        );
        token.initializeBond(
            BondToken.BondMetadata({
                bondId: "BOND-2026-MINING-E1",
                isin: "BRMINE26E01",
                issuer: _deployer,
                issuerName: "Vale S.A.",
                issuerJurisdiction: "BR",
                issuerSector: "Mining",
                issuerCreditRating: "B+",
                parValue: 1000,
                currency: "USD",
                couponRateBps: 825,
                couponFrequency: "semi-annual",
                issueDate: 1735689600,
                maturityDate: 1924905600,
                seniority: "senior-secured",
                collateralType: "Iron ore export receivables and mining equipment",
                covenantSummary: "Min tangible net worth $5B. Environmental compliance. Production floor.",
                callProvision: "Make-whole call at T+50bps",
                offeringType: "144A",
                minimumDenomination: 250_000,
                qualifiedBuyerOnly: true,
                termSheetHash: keccak256("term-sheet-BOND-2026-MINING-E1")
            }),
            10_000 * 10 ** 18
        );
        console.log("  BOND-2026-MINING-E1:", address(token));
        return address(token);
    }

    function _deployBondRetail() internal returns (address) {
        BondToken token = new BondToken(
            "Fideza Bond - RETAIL F1", "FBOND-RF1",
            _endpoint, _rnEndpoint, _userGovernance, _instReg
        );
        token.initializeBond(
            BondToken.BondMetadata({
                bondId: "BOND-2026-RETAIL-F1",
                isin: "BRRETL26F01",
                issuer: _deployer,
                issuerName: "Magazine Luiza S.A.",
                issuerJurisdiction: "BR",
                issuerSector: "Retail",
                issuerCreditRating: "BBB-",
                parValue: 1000,
                currency: "BRL",
                couponRateBps: 500,
                couponFrequency: "quarterly",
                issueDate: 1743465600,
                maturityDate: 1869782400,
                seniority: "senior-unsecured",
                collateralType: "",
                covenantSummary: "Debt/EBITDA max 4.5x. Min interest coverage 2.0x. Restricted dividends if leverage > 3.5x.",
                callProvision: "Non-callable",
                offeringType: "Reg S",
                minimumDenomination: 50_000,
                qualifiedBuyerOnly: false,
                termSheetHash: keccak256("term-sheet-BOND-2026-RETAIL-F1")
            }),
            10_000 * 10 ** 18
        );
        console.log("  BOND-2026-RETAIL-F1:", address(token));
        return address(token);
    }

    // =================================================================
    // Invoice deployments
    // =================================================================

    function _deployInvCargill() internal returns (address) {
        InvoiceToken token = new InvoiceToken(
            "Fideza Invoice - INV-2026-01122", "FINV-1122",
            _endpoint, _rnEndpoint, _userGovernance, _instReg
        );
        token.initializeInvoice(
            InvoiceToken.InvoiceMetadata({
                invoiceId: "INV-2026-01122",
                issuer: _deployer,
                debtorName: "Cargill Agricola S.A.",
                debtorJurisdiction: "BR",
                debtorCreditRating: "BBB",
                debtorIndustry: "Agriculture",
                faceValue: 15_000_000e18,
                currency: "BRL",
                issueDate: 1743465600,
                dueDate: 1751328000,
                paymentTerms: "Net 90",
                recourseType: "full",
                priorityClaim: false,
                invoiceDocHash: keccak256("invoice-pdf-INV-2026-01122"),
                previouslyTokenized: false
            }),
            15_000_000 * 10 ** 18
        );
        console.log("  INV-2026-01122:", address(token));
        return address(token);
    }

    function _deployInvTotvs() internal returns (address) {
        InvoiceToken token = new InvoiceToken(
            "Fideza Invoice - INV-2026-01455", "FINV-1455",
            _endpoint, _rnEndpoint, _userGovernance, _instReg
        );
        token.initializeInvoice(
            InvoiceToken.InvoiceMetadata({
                invoiceId: "INV-2026-01455",
                issuer: _deployer,
                debtorName: "TOTVS S.A.",
                debtorJurisdiction: "BR",
                debtorCreditRating: "A",
                debtorIndustry: "Technology",
                faceValue: 8_000_000e18,
                currency: "BRL",
                issueDate: 1746057600,
                dueDate: 1753920000,
                paymentTerms: "Net 90",
                recourseType: "limited",
                priorityClaim: true,
                invoiceDocHash: keccak256("invoice-pdf-INV-2026-01455"),
                previouslyTokenized: false
            }),
            8_000_000 * 10 ** 18
        );
        console.log("  INV-2026-01455:", address(token));
        return address(token);
    }

    // =================================================================
    // ABS deployments
    // =================================================================

    function _deployAbsMortgage() internal returns (address) {
        ABSToken token = new ABSToken(
            "Fideza ABS - Mortgage Senior", "FABS-MS",
            _endpoint, _rnEndpoint, _userGovernance, _instReg
        );

        ABSToken.LoanData[] memory loans = new ABSToken.LoanData[](10);
        loans[0] = ABSToken.LoanData("ML-001", "SP", 740, 350_000e18, 950, 240, 0);
        loans[1] = ABSToken.LoanData("ML-002", "RJ", 720, 280_000e18, 1050, 300, 0);
        loans[2] = ABSToken.LoanData("ML-003", "SP", 760, 420_000e18, 900, 180, 0);
        loans[3] = ABSToken.LoanData("ML-004", "MG", 710, 250_000e18, 1100, 240, 0);
        loans[4] = ABSToken.LoanData("ML-005", "SP", 750, 380_000e18, 950, 300, 0);
        loans[5] = ABSToken.LoanData("ML-006", "BA", 700, 220_000e18, 1150, 360, 0);
        loans[6] = ABSToken.LoanData("ML-007", "PR", 730, 310_000e18, 1000, 240, 0);
        loans[7] = ABSToken.LoanData("ML-008", "SP", 745, 390_000e18, 925, 180, 0);
        loans[8] = ABSToken.LoanData("ML-009", "RS", 715, 270_000e18, 1075, 300, 1);
        loans[9] = ABSToken.LoanData("ML-010", "SP", 755, 400_000e18, 900, 240, 0);

        token.initializeABS(
            ABSToken.ABSMetadata({
                absId: "ABS-2026-MORT-001",
                issuer: _deployer,
                poolType: "residential-mortgages",
                totalPoolSize: 520,
                totalPoolNotional: 165_000_000e18,
                trancheName: "Class A Senior",
                trancheSeniority: "senior",
                trancheSize: 132_000_000e18,
                creditEnhancementBps: 2000,
                subordinationLevelBps: 2000,
                currency: "BRL",
                expectedMaturity: 1924905600,
                servicerName: "Caixa Economica Federal",
                auditorName: "Deloitte Touche Tohmatsu",
                offeringCircularHash: keccak256("offering-circular-ABS-2026-MORT-001"),
                poolTapeHash: keccak256("pool-tape-ABS-2026-MORT-001")
            }),
            loans,
            20_000 * 10 ** 18
        );
        console.log("  ABS-2026-MORT-001:", address(token));
        return address(token);
    }

    function _deployAbsCredit() internal returns (address) {
        ABSToken token = new ABSToken(
            "Fideza ABS - Consumer Credit", "FABS-CC",
            _endpoint, _rnEndpoint, _userGovernance, _instReg
        );

        ABSToken.LoanData[] memory loans = new ABSToken.LoanData[](10);
        loans[0] = ABSToken.LoanData("CL-001", "SP", 690, 12_000e18, 2400, 24, 0);
        loans[1] = ABSToken.LoanData("CL-002", "RJ", 670, 8_500e18, 2800, 36, 0);
        loans[2] = ABSToken.LoanData("CL-003", "SP", 710, 15_000e18, 2200, 18, 0);
        loans[3] = ABSToken.LoanData("CL-004", "MG", 650, 6_000e18, 3200, 24, 1);
        loans[4] = ABSToken.LoanData("CL-005", "SP", 700, 11_000e18, 2500, 36, 0);
        loans[5] = ABSToken.LoanData("CL-006", "BA", 680, 9_500e18, 2700, 24, 0);
        loans[6] = ABSToken.LoanData("CL-007", "PR", 720, 18_000e18, 2100, 12, 0);
        loans[7] = ABSToken.LoanData("CL-008", "SP", 695, 13_500e18, 2350, 36, 0);
        loans[8] = ABSToken.LoanData("CL-009", "RS", 660, 7_000e18, 3000, 24, 0);
        loans[9] = ABSToken.LoanData("CL-010", "SP", 705, 14_000e18, 2250, 18, 0);

        token.initializeABS(
            ABSToken.ABSMetadata({
                absId: "ABS-2026-CREDIT-001",
                issuer: _deployer,
                poolType: "consumer-credit",
                totalPoolSize: 1200,
                totalPoolNotional: 42_000_000e18,
                trancheName: "Class A Senior",
                trancheSeniority: "senior",
                trancheSize: 33_600_000e18,
                creditEnhancementBps: 1800,
                subordinationLevelBps: 2000,
                currency: "BRL",
                expectedMaturity: 1869782400,
                servicerName: "Nu Pagamentos S.A. (Nubank)",
                auditorName: "KPMG Auditores Independentes",
                offeringCircularHash: keccak256("offering-circular-ABS-2026-CREDIT-001"),
                poolTapeHash: keccak256("pool-tape-ABS-2026-CREDIT-001")
            }),
            loans,
            12_000 * 10 ** 18
        );
        console.log("  ABS-2026-CREDIT-001:", address(token));
        return address(token);
    }
}
