// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ReceiptTokenFactory} from "../src/ReceiptTokenFactory.sol";
import {PTYTSplitter} from "../src/PTYTSplitter.sol";
import {FidezaMarketplace} from "../src/FidezaMarketplace.sol";

/// @title DeployPhase4
/// @notice Phase 4: Deploy public chain contracts, register receipts, initialize PT/YT splits.
///
/// Usage:
///   source .env
///   forge script script/DeployPhase4.s.sol --rpc-url $PUBLIC_CHAIN_RPC_URL --broadcast --legacy
contract DeployPhase4 is Script {

    bytes32 constant INVOICE_ASSET_ID = keccak256(bytes("INV-2026-00847"));
    bytes32 constant BOND_ASSET_ID    = keccak256(bytes("BOND-2026-ENERGY-A1"));
    bytes32 constant ABS_ASSET_ID     = keccak256(bytes("ABS-2026-AUTO-001"));
    bytes32 constant POLICY_HASH      = keccak256("FIDEZA_POLICY_V1.0.0");

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        address invoiceMirror = vm.envAddress("INVOICE_MIRROR_ADDRESS");
        address bondMirror    = vm.envAddress("BOND_MIRROR_ADDRESS");
        address absMirror     = vm.envAddress("ABS_MIRROR_ADDRESS");

        vm.startBroadcast(deployerKey);

        // 1. Deploy main contracts
        console.log("=== Phase 4: Deploying Public Chain Contracts ===");

        ReceiptTokenFactory factory = new ReceiptTokenFactory();
        console.log("  ReceiptTokenFactory:", address(factory));

        PTYTSplitter splitter = new PTYTSplitter();
        console.log("  PTYTSplitter:       ", address(splitter));

        FidezaMarketplace marketplace = new FidezaMarketplace();
        console.log("  FidezaMarketplace:  ", address(marketplace));

        // 2. Register receipts
        console.log("");
        console.log("=== Registering receipt tokens ===");
        _registerInvoice(factory, invoiceMirror);
        _registerBond(factory, bondMirror);
        _registerABS(factory, absMirror);

        // 3. Initialize PT/YT splits
        console.log("");
        console.log("=== Initializing PT/YT splits ===");
        _initInvoiceSplit(splitter, invoiceMirror);
        _initBondSplit(splitter, bondMirror);
        _initABSSplit(splitter, absMirror);

        vm.stopBroadcast();

        // Summary
        console.log("");
        console.log("=== Phase 4 Deployment Complete ===");
        console.log("");
        console.log("Update .env with:");
        console.log("  RECEIPT_TOKEN_FACTORY_ADDRESS=%s", vm.toString(address(factory)));
        console.log("  PTYT_SPLITTER_ADDRESS=%s", vm.toString(address(splitter)));
        console.log("  FIDEZA_MARKETPLACE_ADDRESS=%s", vm.toString(address(marketplace)));
        console.log("");
        console.log("Verify on Public Chain explorer: https://testnet-explorer.rayls.com");
    }

    function _registerInvoice(ReceiptTokenFactory factory, address mirror) internal {
        factory.registerReceipt(ReceiptTokenFactory.ReceiptInfo({
            assetId: INVOICE_ASSET_ID,
            mirrorTokenAddress: mirror,
            assetType: "INVOICE",
            disclosureJSON: '{"maturityBucket":"90-180 days","currency":"BRL","notionalRange":"R$25M-R$100M","debtorIndustry":"Construction","debtorCreditTier":"A","recourseType":"limited"}',
            complianceReportHash: keccak256(abi.encodePacked("fideza-compliance-report-invoice-v3")),
            policyVersionHash: POLICY_HASH,
            governanceApprovalTx: bytes32(0),
            maturityTimestamp: 1748563200,
            principalValue: 25_000_000 * 1e18,
            expectedYieldValue: 750_000 * 1e18
        }));
        console.log("  Invoice receipt registered");
    }

    function _registerBond(ReceiptTokenFactory factory, address mirror) internal {
        factory.registerReceipt(ReceiptTokenFactory.ReceiptInfo({
            assetId: BOND_ASSET_ID,
            mirrorTokenAddress: mirror,
            assetType: "BOND",
            disclosureJSON: '{"issuerCategory":"LatAm Energy, High Yield","seniority":"senior-unsecured","maturityBucket":"5-10 years","couponRange":"5-6%","currency":"USD","parValue":1000,"couponFrequency":"semi-annual","creditTier":"HY","hasCollateral":false}',
            complianceReportHash: keccak256(abi.encodePacked("fideza-compliance-report-bond-v3")),
            policyVersionHash: POLICY_HASH,
            governanceApprovalTx: bytes32(0),
            maturityTimestamp: 1926201600,
            principalValue: 1000 * 1e18,
            expectedYieldValue: 287_500 * 1e15
        }));
        console.log("  Bond receipt registered");
    }

    function _registerABS(ReceiptTokenFactory factory, address mirror) internal {
        factory.registerReceipt(ReceiptTokenFactory.ReceiptInfo({
            assetId: ABS_ASSET_ID,
            mirrorTokenAddress: mirror,
            assetType: "ABS",
            disclosureJSON: '{"poolType":"auto-loans","poolSizeBucket":"100-500 loans","trancheSeniority":"senior","creditEnhancementBps":1550,"subordinationLevelBps":2000,"currency":"BRL","expectedMaturityBucket":"2-5 years","avgCreditScoreRange":"680-720","delinquencyRateBucket":"<5%"}',
            complianceReportHash: keccak256(abi.encodePacked("fideza-compliance-report-abs-v3")),
            policyVersionHash: POLICY_HASH,
            governanceApprovalTx: bytes32(0),
            maturityTimestamp: 1869523200,
            principalValue: 14_800 * 1e18,
            expectedYieldValue: 310_800 * 1e15
        }));
        console.log("  ABS receipt registered");
    }

    function _initInvoiceSplit(PTYTSplitter splitter, address mirror) internal {
        (address pt, address yt) = splitter.initializeSplit(
            PTYTSplitter.InitParams({
                assetId: INVOICE_ASSET_ID,
                receiptToken: mirror,
                maturityTimestamp: 1748563200,
                principalPerToken: 25_000_000 * 1e18,
                expectedYieldPerToken: 750_000 * 1e18,
                ptName: "Fideza PT - Invoice INV-847",
                ptSymbol: "FPT-INV847",
                ytName: "Fideza YT - Invoice INV-847",
                ytSymbol: "FYT-INV847"
            })
        );
        console.log("  Invoice PT:", pt);
        console.log("  Invoice YT:", yt);
    }

    function _initBondSplit(PTYTSplitter splitter, address mirror) internal {
        (address pt, address yt) = splitter.initializeSplit(
            PTYTSplitter.InitParams({
                assetId: BOND_ASSET_ID,
                receiptToken: mirror,
                maturityTimestamp: 1926201600,
                principalPerToken: 1000 * 1e18,
                expectedYieldPerToken: 287_500 * 1e15,
                ptName: "Fideza PT - Bond ENERGY-A1",
                ptSymbol: "FPT-BONDA1",
                ytName: "Fideza YT - Bond ENERGY-A1",
                ytSymbol: "FYT-BONDA1"
            })
        );
        console.log("  Bond PT:   ", pt);
        console.log("  Bond YT:   ", yt);
    }

    function _initABSSplit(PTYTSplitter splitter, address mirror) internal {
        (address pt, address yt) = splitter.initializeSplit(
            PTYTSplitter.InitParams({
                assetId: ABS_ASSET_ID,
                receiptToken: mirror,
                maturityTimestamp: 1869523200,
                principalPerToken: 14_800 * 1e18,
                expectedYieldPerToken: 310_800 * 1e15,
                ptName: "Fideza PT - ABS Auto-A",
                ptSymbol: "FPT-ABSA",
                ytName: "Fideza YT - ABS Auto-A",
                ytSymbol: "FYT-ABSA"
            })
        );
        console.log("  ABS PT:    ", pt);
        console.log("  ABS YT:    ", yt);
    }
}
