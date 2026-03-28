// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {InvoiceToken} from "../src/InvoiceToken.sol";
import {BondToken} from "../src/BondToken.sol";
import {ABSToken} from "../src/ABSToken.sol";

/// @title Phase3Bridge
/// @notice Phase 3 Step 2: Bridge tokens from Privacy Node to Public Chain via teleportToPublicChain().
///
///         IMPORTANT: This script must be signed with REGISTERED_PRIVATE_KEY.
///         The onlyRegisteredUsers modifier requires an approved user in RNUserGovernanceV1.
///
///         Prerequisites:
///         - Phase3Governance.s.sol has been run (attestations + approvals + token transfers)
///         - Tokens registered + approved via backend API (done in Phase 1)
///         - REGISTERED address holds the tokens to bridge
///
/// Usage:
///   source .env
///   forge script script/Phase3Bridge.s.sol --rpc-url $PRIVACY_NODE_RPC_URL --broadcast --legacy
contract Phase3Bridge is Script {
    function run() external {
        uint256 registeredKey = vm.envUint("REGISTERED_PRIVATE_KEY");
        address transferTo = vm.envAddress("TRANSFER_TO");
        uint256 publicChainId = vm.envUint("PUBLIC_CHAIN_ID");

        InvoiceToken invoiceToken = InvoiceToken(vm.envAddress("INVOICE_TOKEN_ADDRESS"));
        BondToken bondToken = BondToken(vm.envAddress("BOND_TOKEN_ADDRESS"));
        ABSToken absToken = ABSToken(vm.envAddress("ABS_TOKEN_ADDRESS"));

        uint256 invoiceAmount = 1_000_000 * 10 ** 18;
        uint256 bondAmount = 500 * 10 ** 18;
        uint256 absAmount = 1_000 * 10 ** 18;

        console.log("=== Phase 3: Bridging Tokens to Public Chain ===");
        console.log("  Transfer to:", transferTo);
        console.log("  Public Chain ID:", publicChainId);
        console.log("");

        vm.startBroadcast(registeredKey);

        // --- Bridge Invoice ---
        console.log("Bridging InvoiceToken (1,000,000 units)...");
        bool s1 = invoiceToken.teleportToPublicChain(transferTo, invoiceAmount, publicChainId);
        require(s1, "Invoice teleport failed");
        console.log("  Invoice teleport initiated");

        // --- Bridge Bond ---
        console.log("Bridging BondToken (500 units)...");
        bool s2 = bondToken.teleportToPublicChain(transferTo, bondAmount, publicChainId);
        require(s2, "Bond teleport failed");
        console.log("  Bond teleport initiated");

        // --- Bridge ABS ---
        console.log("Bridging ABSToken (1,000 units)...");
        bool s3 = absToken.teleportToPublicChain(transferTo, absAmount, publicChainId);
        require(s3, "ABS teleport failed");
        console.log("  ABS teleport initiated");

        vm.stopBroadcast();

        console.log("");
        console.log("=== All 3 tokens locked on Privacy Node ===");
        console.log("The relayer will mint mirror tokens on the Public Chain shortly (~60s each).");
        console.log("");
        console.log("Verify on:");
        console.log("  Privacy Node: https://blockscout-privacy-node-1.rayls.com");
        console.log("  Public Chain: https://testnet-explorer.rayls.com");
    }
}
