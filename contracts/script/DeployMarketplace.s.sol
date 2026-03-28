// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Marketplace} from "../src/Marketplace.sol";

/// @title DeployMarketplace
/// @notice Deploys the Marketplace escrow contract on the public chain.
///
/// Usage:
///   source .env
///   forge script script/DeployMarketplace.s.sol --rpc-url $PUBLIC_CHAIN_RPC_URL --broadcast --legacy
contract DeployMarketplace is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        Marketplace marketplace = new Marketplace();
        vm.stopBroadcast();

        console.log("=== Deployed to Public Chain ===");
        console.log("  Marketplace:", address(marketplace));
        console.log("");
        console.log("Add to your .env:");
        console.log("  MARKETPLACE_ADDRESS=%s", vm.toString(address(marketplace)));
    }
}
