// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IConstraintHonkVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}

/// @title ZKConstraintVerifier
/// @notice Verifies that the AI portfolio agent respected the investor's constraints.
///         Proves: allocations satisfy min rating, max exposure, min bonds, target yield.
contract ZKConstraintVerifier is Ownable {

    IConstraintHonkVerifier public immutable honkVerifier;

    struct VerifiedConstraints {
        uint8 constraintMinRating;
        uint8 constraintMaxRating;
        uint256 constraintMaxExposureBps;
        uint8 constraintMinBonds;
        uint256 constraintTargetYieldBps;
        uint256 actualWeightedCouponBps;
        uint8 actualNumBonds;
        uint256 verifiedAt;
    }

    mapping(bytes32 => VerifiedConstraints) public portfolios;

    event ConstraintComplianceVerified(bytes32 indexed portfolioId, uint8 numBonds, uint256 yield, uint256 timestamp);

    constructor(address _honkVerifier) Ownable(msg.sender) {
        honkVerifier = IConstraintHonkVerifier(_honkVerifier);
    }

    function verifyAndStore(
        bytes32 portfolioId,
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external {
        require(publicInputs.length == 7, "Expected 7 public inputs");
        require(honkVerifier.verify(proof, publicInputs), "ZK proof invalid");

        portfolios[portfolioId] = VerifiedConstraints({
            constraintMinRating: uint8(uint256(publicInputs[0])),
            constraintMaxRating: uint8(uint256(publicInputs[1])),
            constraintMaxExposureBps: uint256(publicInputs[2]),
            constraintMinBonds: uint8(uint256(publicInputs[3])),
            constraintTargetYieldBps: uint256(publicInputs[4]),
            actualWeightedCouponBps: uint256(publicInputs[5]),
            actualNumBonds: uint8(uint256(publicInputs[6])),
            verifiedAt: block.timestamp
        });

        emit ConstraintComplianceVerified(
            portfolioId,
            uint8(uint256(publicInputs[6])),
            uint256(publicInputs[5]),
            block.timestamp
        );
    }

    function hasValidProof(bytes32 portfolioId) external view returns (bool) {
        return portfolios[portfolioId].verifiedAt > 0;
    }

    function getVerifiedConstraints(bytes32 portfolioId) external view returns (VerifiedConstraints memory) {
        return portfolios[portfolioId];
    }
}
