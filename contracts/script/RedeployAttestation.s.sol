// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PortfolioAttestation} from "../src/PortfolioAttestation.sol";
import {AIAttestationVerifier} from "../src/AIAttestationVerifier.sol";
import {FidezaLendingPool} from "../src/FidezaLendingPool.sol";

/// @title RedeployAttestation
/// @notice Redeploys PortfolioAttestation with getAllPortfolioIds() support,
///         plus fresh AIAttestationVerifier and FidezaLendingPool wired to it.
///
/// Usage:
///   source contracts/.env
///   forge script script/RedeployAttestation.s.sol --rpc-url $PUBLIC_CHAIN_RPC_URL --broadcast --legacy
contract RedeployAttestation is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address agentAddress = vm.addr(deployerKey);

        console.log("=== Redeploy PortfolioAttestation (with enumeration) ===");
        console.log("  Agent address:", agentAddress);

        vm.startBroadcast(deployerKey);

        // 1. Deploy updated PortfolioAttestation
        PortfolioAttestation attestation = new PortfolioAttestation(agentAddress);
        console.log("  PortfolioAttestation:", address(attestation));

        // 2. Deploy fresh AIAttestationVerifier pointing to new attestation
        AIAttestationVerifier verifier = new AIAttestationVerifier(address(attestation));
        console.log("  AIAttestationVerifier:", address(verifier));

        // 3. Deploy fresh FidezaLendingPool pointing to new verifier
        FidezaLendingPool pool = new FidezaLendingPool(address(verifier));
        console.log("  FidezaLendingPool:", address(pool));

        vm.stopBroadcast();

        console.log("");
        console.log("Update .env and frontend with:");
        console.log("  PORTFOLIO_ATTESTATION_ADDRESS=%s", vm.toString(address(attestation)));
        console.log("  AI_ATTESTATION_VERIFIER_ADDRESS=%s", vm.toString(address(verifier)));
        console.log("  FIDEZA_LENDING_POOL_ADDRESS=%s", vm.toString(address(pool)));
    }
}
