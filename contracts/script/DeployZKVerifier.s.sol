// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {ZKPortfolioVerifier} from "../src/ZKPortfolioVerifier.sol";
import {FidezaLendingPool} from "../src/FidezaLendingPool.sol";
import {HonkVerifier} from "../src/plonk_vk.sol";

/// @title DeployZKVerifier
/// @notice Deploys HonkVerifier (generated), ZKPortfolioVerifier, and a new
///         FidezaLendingPool wired to the ZK verifier.
///
/// Usage:
///   source .env
///   forge script script/DeployZKVerifier.s.sol --rpc-url $PUBLIC_CHAIN_RPC_URL --broadcast --legacy
contract DeployZKVerifier is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("=== Phase 11: ZK Portfolio Verifier Deployment ===");
        console.log("  Deployer:", deployer);
        console.log("");

        vm.startBroadcast(deployerKey);

        // 1. Deploy the Barretenberg-generated HonkVerifier
        HonkVerifier honkVerifier = new HonkVerifier();
        console.log("  HonkVerifier:                ", address(honkVerifier));

        // 2. Deploy ZKPortfolioVerifier wrapping it
        ZKPortfolioVerifier zkVerifier = new ZKPortfolioVerifier(address(honkVerifier));
        console.log("  ZKPortfolioVerifier:         ", address(zkVerifier));

        // 3. Deploy new FidezaLendingPool with ZK verifier
        FidezaLendingPool pool = new FidezaLendingPool(address(zkVerifier));
        console.log("  FidezaLendingPool (ZK):      ", address(pool));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Phase 11 Deployment Complete ===");
        console.log("Add to your .env:");
        console.log("  ZK_PORTFOLIO_VERIFIER_ADDRESS=%s", vm.toString(address(zkVerifier)));
        console.log("  ZK_LENDING_POOL_ADDRESS=%s", vm.toString(address(pool)));
    }
}
