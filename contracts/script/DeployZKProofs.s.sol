// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {ConstraintHonkVerifier} from "../src/ConstraintVerifier.sol";
import {RatingHonkVerifier} from "../src/RatingVerifier.sol";
import {ZKConstraintVerifier} from "../src/ZKConstraintVerifier.sol";
import {ZKRatingVerifier} from "../src/ZKRatingVerifier.sol";

/// @title DeployZKProofs
/// @notice Deploys Constraint Compliance + Bond Rating Integrity verifiers.
///
/// Usage:
///   source .env
///   forge script script/DeployZKProofs.s.sol --rpc-url $PUBLIC_CHAIN_RPC_URL --broadcast --legacy
contract DeployZKProofs is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("=== Phase 12: ZK Constraint + Rating Verifier Deployment ===");
        console.log("  Deployer:", deployer);
        console.log("");

        vm.startBroadcast(deployerKey);

        // 1. Constraint Compliance Proof
        ConstraintHonkVerifier constraintHonk = new ConstraintHonkVerifier();
        console.log("  ConstraintHonkVerifier:      ", address(constraintHonk));

        ZKConstraintVerifier zkConstraint = new ZKConstraintVerifier(address(constraintHonk));
        console.log("  ZKConstraintVerifier:         ", address(zkConstraint));

        // 2. Bond Rating Integrity Proof
        RatingHonkVerifier ratingHonk = new RatingHonkVerifier();
        console.log("  RatingHonkVerifier:           ", address(ratingHonk));

        ZKRatingVerifier zkRating = new ZKRatingVerifier(address(ratingHonk));
        console.log("  ZKRatingVerifier:             ", address(zkRating));

        vm.stopBroadcast();

        console.log("");
        console.log("=== Phase 12 Deployment Complete ===");
        console.log("Add to your .env:");
        console.log("  ZK_CONSTRAINT_VERIFIER_ADDRESS=%s", vm.toString(address(zkConstraint)));
        console.log("  ZK_RATING_VERIFIER_ADDRESS=%s", vm.toString(address(zkRating)));
    }
}
