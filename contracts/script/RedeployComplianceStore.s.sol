// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ComplianceStore} from "../src/ComplianceStore.sol";
import {DisclosureGate} from "../src/DisclosureGate.sol";

/// @title RedeployComplianceStore
/// @notice Redeploys ComplianceStore and DisclosureGate to allow fresh attestations.
///
/// Usage:
///   source .env
///   forge script script/RedeployComplianceStore.s.sol --rpc-url $PRIVACY_NODE_RPC_URL --broadcast --legacy
contract RedeployComplianceStore is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployerAddr = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // Redeploy ComplianceStore (agent = deployer)
        ComplianceStore compStore = new ComplianceStore(deployerAddr);
        console.log("  New ComplianceStore:", address(compStore));

        // Redeploy DisclosureGate pointing to new ComplianceStore
        DisclosureGate gate = new DisclosureGate(address(compStore), deployerAddr);
        console.log("  New DisclosureGate: ", address(gate));

        vm.stopBroadcast();

        console.log("");
        console.log("Update .env:");
        console.log("  COMPLIANCE_STORE_ADDRESS=", vm.toString(address(compStore)));
        console.log("  DISCLOSURE_GATE_ADDRESS=", vm.toString(address(gate)));
    }
}
