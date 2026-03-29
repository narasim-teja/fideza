// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {IDeploymentProxyRegistryV1} from "rayls-protocol-sdk/interfaces/IDeploymentProxyRegistryV1.sol";
import {InstitutionRegistry} from "../src/InstitutionRegistry.sol";
import {ComplianceStore} from "../src/ComplianceStore.sol";
import {DisclosureGate} from "../src/DisclosureGate.sol";
import {InvoiceToken} from "../src/InvoiceToken.sol";
import {BondToken} from "../src/BondToken.sol";
import {ABSToken} from "../src/ABSToken.sol";

/// @title DeployPhase1
/// @notice Deploys all Phase 1 Privacy Node contracts for Fideza.
///
/// Usage:
///   source .env
///   forge script script/DeployPhase1.s.sol --rpc-url $PRIVACY_NODE_RPC_URL --broadcast --legacy
contract DeployPhase1 is Script {
    function run() external {
        // Read configuration
        address registryAddr = vm.envAddress("DEPLOYMENT_PROXY_REGISTRY");
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        // Use deployer address as agent and governance admin for now
        // Update these after Phase 2 when the AI agent has its own key
        address deployerAddr = vm.addr(deployerKey);

        // Discover Rayls infrastructure
        IDeploymentProxyRegistryV1 registry = IDeploymentProxyRegistryV1(registryAddr);
        address endpoint = registry.getContract("Endpoint");
        address rnEndpoint = registry.getContract("RNEndpoint");
        address userGovernance = registry.getContract("RNUserGovernance");

        require(endpoint != address(0), "Endpoint not found");
        require(rnEndpoint != address(0), "RNEndpoint not found");
        require(userGovernance != address(0), "RNUserGovernance not found");

        console.log("=== Rayls Infrastructure ===");
        console.log("  Endpoint:        ", endpoint);
        console.log("  RNEndpoint:      ", rnEndpoint);
        console.log("  RNUserGovernance:", userGovernance);
        console.log("");

        vm.startBroadcast(deployerKey);

        // 1. InstitutionRegistry (no deps)
        InstitutionRegistry instReg = new InstitutionRegistry();
        console.log("  InstitutionRegistry:", address(instReg));

        // 2. ComplianceStore (agent = deployer for now)
        ComplianceStore compStore = new ComplianceStore(deployerAddr);
        console.log("  ComplianceStore:    ", address(compStore));

        // 3. DisclosureGate (governance admin = deployer for now)
        DisclosureGate gate = new DisclosureGate(address(compStore), deployerAddr);
        console.log("  DisclosureGate:     ", address(gate));

        // 4. InvoiceToken (ERC-20, one per invoice)
        InvoiceToken invoice = new InvoiceToken(
            "Fideza Invoice - INV-2026-00847",
            "FINV-847",
            endpoint,
            rnEndpoint,
            userGovernance,
            address(instReg)
        );
        console.log("  InvoiceToken:       ", address(invoice));

        // 5. BondToken (ERC-20)
        BondToken bond = new BondToken(
            "Fideza Bond - ENERGY A1",
            "FBOND-EA1",
            endpoint,
            rnEndpoint,
            userGovernance,
            address(instReg)
        );
        console.log("  BondToken:          ", address(bond));

        // 6. ABSToken (ERC-20)
        ABSToken abs = new ABSToken(
            "Fideza ABS - Auto Senior A",
            "FABS-AA",
            endpoint,
            rnEndpoint,
            userGovernance,
            address(instReg)
        );
        console.log("  ABSToken:           ", address(abs));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Phase 1 Deployment Complete ===");
        console.log("Update .env with these addresses:");
        console.log("  INSTITUTION_REGISTRY_ADDRESS=", vm.toString(address(instReg)));
        console.log("  COMPLIANCE_STORE_ADDRESS=", vm.toString(address(compStore)));
        console.log("  DISCLOSURE_GATE_ADDRESS=", vm.toString(address(gate)));
        console.log("  INVOICE_TOKEN_ADDRESS=", vm.toString(address(invoice)));
        console.log("  BOND_TOKEN_ADDRESS=", vm.toString(address(bond)));
        console.log("  ABS_TOKEN_ADDRESS=", vm.toString(address(abs)));
    }
}
