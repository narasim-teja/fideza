// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {ZKPortfolioVerifier} from "../src/ZKPortfolioVerifier.sol";

/// @notice Submit a ZK proof on-chain for a given portfolio ID.
/// Usage:
///   source .env
///   forge script script/SubmitZKProof.s.sol --rpc-url $PUBLIC_CHAIN_RPC_URL --broadcast --legacy
contract SubmitZKProof is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        bytes32 portfolioId = 0xe71c156c9e380f2383d0e5331b6584d667384656c310f2333cc42813f2eb6972;
        address zkVerifierAddr = 0xce7B8e83753b148e8fB4e852ba8e59eC67f15dd1;

        // Read proof bytes from file
        bytes memory proof = vm.readFileBinary("../circuits/portfolio_proof/target/proof/proof");
        console.log("  Proof size:", proof.length, "bytes");

        // Public inputs matching our Prover.toml demo portfolio:
        //   totalValue=1000000, weightedCouponBps=615, numBonds=5,
        //   minRatingIndex=7, maxRatingIndex=4, maxSingleExposureBps=2500,
        //   diversificationScore=8
        bytes32[] memory publicInputs = new bytes32[](7);
        publicInputs[0] = bytes32(uint256(1000000));
        publicInputs[1] = bytes32(uint256(615));
        publicInputs[2] = bytes32(uint256(5));
        publicInputs[3] = bytes32(uint256(7));
        publicInputs[4] = bytes32(uint256(4));
        publicInputs[5] = bytes32(uint256(2500));
        publicInputs[6] = bytes32(uint256(8));

        console.log("=== Submitting ZK Proof ===");
        console.log("  Portfolio:", vm.toString(portfolioId));

        vm.startBroadcast(deployerKey);

        ZKPortfolioVerifier verifier = ZKPortfolioVerifier(zkVerifierAddr);
        verifier.verifyAndStore(portfolioId, proof, publicInputs);

        vm.stopBroadcast();

        console.log("  ZK Proof submitted and verified on-chain!");
    }
}
