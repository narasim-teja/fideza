// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {ComplianceStore} from "../src/ComplianceStore.sol";
import {DisclosureGate} from "../src/DisclosureGate.sol";
import {InvoiceToken} from "../src/InvoiceToken.sol";
import {BondToken} from "../src/BondToken.sol";
import {ABSToken} from "../src/ABSToken.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title Phase3Governance
/// @notice Phase 3 Step 1: Redeploy ComplianceStore + DisclosureGate, submit APPROVE attestations,
///         approve disclosures, and transfer tokens to registered address for bridging.
///
/// Usage:
///   source .env
///   forge script script/Phase3Governance.s.sol --rpc-url $PRIVACY_NODE_RPC_URL --broadcast --legacy
contract Phase3Governance is Script {
    using MessageHashUtils for bytes32;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployerAddr = vm.addr(deployerKey);
        uint256 registeredKey = vm.envUint("REGISTERED_PRIVATE_KEY");
        address registeredAddr = vm.addr(registeredKey);

        // Load token contracts
        InvoiceToken invoiceToken = InvoiceToken(vm.envAddress("INVOICE_TOKEN_ADDRESS"));
        BondToken bondToken = BondToken(vm.envAddress("BOND_TOKEN_ADDRESS"));
        ABSToken absToken = ABSToken(vm.envAddress("ABS_TOKEN_ADDRESS"));

        vm.startBroadcast(deployerKey);

        // ============================================================
        // 1. Redeploy ComplianceStore v3 + DisclosureGate v3
        // ============================================================
        console.log("=== 1. Redeploying ComplianceStore + DisclosureGate ===");

        ComplianceStore compStore = new ComplianceStore(deployerAddr);
        console.log("  ComplianceStore v3:", address(compStore));

        DisclosureGate gate = new DisclosureGate(address(compStore), deployerAddr);
        console.log("  DisclosureGate v3: ", address(gate));

        // ============================================================
        // 2. Submit APPROVE attestations for all 3 assets
        // ============================================================
        console.log("");
        console.log("=== 2. Submitting APPROVE attestations ===");

        bytes32 policyVersionHash = keccak256("FIDEZA_POLICY_V1.0.0");

        // --- Invoice ---
        {
            bytes32 assetId = keccak256(bytes("INV-2026-00847"));
            bytes32 reportHash = keccak256(abi.encodePacked("fideza-compliance-report-invoice-v3"));
            bytes32 disclosureSchemaHash = keccak256("INVOICE_DISCLOSURE_SCHEMA_V1");
            uint256 riskScore = 95;

            _submitAttestation(
                compStore, deployerKey, assetId, reportHash, policyVersionHash,
                riskScore, disclosureSchemaHash
            );
            console.log("  Invoice attestation submitted (score: 95, APPROVE)");
        }

        // --- Bond ---
        {
            bytes32 assetId = keccak256(bytes("BOND-2026-ENERGY-A1"));
            bytes32 reportHash = keccak256(abi.encodePacked("fideza-compliance-report-bond-v3"));
            bytes32 disclosureSchemaHash = keccak256("BOND_DISCLOSURE_SCHEMA_V1");
            uint256 riskScore = 100;

            _submitAttestation(
                compStore, deployerKey, assetId, reportHash, policyVersionHash,
                riskScore, disclosureSchemaHash
            );
            console.log("  Bond attestation submitted (score: 100, APPROVE)");
        }

        // --- ABS ---
        {
            bytes32 assetId = keccak256(bytes("ABS-2026-AUTO-001"));
            bytes32 reportHash = keccak256(abi.encodePacked("fideza-compliance-report-abs-v3"));
            bytes32 disclosureSchemaHash = keccak256("ABS_DISCLOSURE_SCHEMA_V1");
            uint256 riskScore = 93;

            _submitAttestation(
                compStore, deployerKey, assetId, reportHash, policyVersionHash,
                riskScore, disclosureSchemaHash
            );
            console.log("  ABS attestation submitted (score: 93, APPROVE)");
        }

        // ============================================================
        // 3. Approve disclosures via DisclosureGate
        // ============================================================
        console.log("");
        console.log("=== 3. Approving disclosures ===");

        {
            bytes32 assetId = keccak256(bytes("INV-2026-00847"));
            bytes32 disclosedFieldsHash = keccak256("INVOICE_DISCLOSED_FIELDS_V1");
            gate.approveDisclosure(assetId, disclosedFieldsHash);
            console.log("  Invoice disclosure approved");
        }

        {
            bytes32 assetId = keccak256(bytes("BOND-2026-ENERGY-A1"));
            bytes32 disclosedFieldsHash = keccak256("BOND_DISCLOSED_FIELDS_V1");
            gate.approveDisclosure(assetId, disclosedFieldsHash);
            console.log("  Bond disclosure approved");
        }

        {
            bytes32 assetId = keccak256(bytes("ABS-2026-AUTO-001"));
            bytes32 disclosedFieldsHash = keccak256("ABS_DISCLOSED_FIELDS_V1");
            gate.approveDisclosure(assetId, disclosedFieldsHash);
            console.log("  ABS disclosure approved");
        }

        // ============================================================
        // 4. Transfer tokens from DEPLOYER to REGISTERED for bridging
        // ============================================================
        console.log("");
        console.log("=== 4. Transferring tokens to registered address ===");
        console.log("  Registered address:", registeredAddr);

        uint256 invoiceAmount = 1_000_000 * 10 ** 18;
        uint256 bondAmount = 500 * 10 ** 18;
        uint256 absAmount = 1_000 * 10 ** 18;

        invoiceToken.transfer(registeredAddr, invoiceAmount);
        console.log("  Invoice: 1,000,000 units transferred");

        bondToken.transfer(registeredAddr, bondAmount);
        console.log("  Bond: 500 units transferred");

        absToken.transfer(registeredAddr, absAmount);
        console.log("  ABS: 1,000 units transferred");

        vm.stopBroadcast();

        // ============================================================
        // Summary
        // ============================================================
        console.log("");
        console.log("=== Phase 3 Governance Complete ===");
        console.log("");
        console.log("Update .env with:");
        console.log("  COMPLIANCE_STORE_ADDRESS=", vm.toString(address(compStore)));
        console.log("  DISCLOSURE_GATE_ADDRESS=", vm.toString(address(gate)));
        console.log("");
        console.log("Then run Phase3Bridge.s.sol to bridge tokens to public chain.");
    }

    function _submitAttestation(
        ComplianceStore compStore,
        uint256 signerKey,
        bytes32 assetId,
        bytes32 reportHash,
        bytes32 policyVersionHash,
        uint256 riskScore,
        bytes32 disclosureSchemaHash
    ) internal {
        uint8 recommendation = 1; // APPROVE

        // Replicate ComplianceStore's message hash computation
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                assetId,
                reportHash,
                policyVersionHash,
                recommendation,
                riskScore,
                disclosureSchemaHash
            )
        );

        // Sign with EIP-191 prefix (matches toEthSignedMessageHash in ComplianceStore)
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, ethSignedHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        compStore.submitAttestation(
            assetId,
            reportHash,
            policyVersionHash,
            signature,
            ComplianceStore.Recommendation.APPROVE,
            riskScore,
            disclosureSchemaHash
        );
    }
}
