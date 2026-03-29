// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IRatingHonkVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}

/// @title ZKRatingVerifier
/// @notice Verifies that the AI agent's published bond rating and risk score
///         honestly derive from the private bond metadata on the Privacy Node.
contract ZKRatingVerifier is Ownable {

    IRatingHonkVerifier public immutable honkVerifier;

    struct VerifiedRating {
        uint8 ratingIndex;
        uint8 riskScore;
        bool hasCollateral;
        uint8 couponRange;
        uint256 verifiedAt;
    }

    mapping(bytes32 => VerifiedRating) public bonds;

    event RatingIntegrityVerified(bytes32 indexed bondId, uint8 ratingIndex, uint8 riskScore, uint256 timestamp);

    constructor(address _honkVerifier) Ownable(msg.sender) {
        honkVerifier = IRatingHonkVerifier(_honkVerifier);
    }

    function verifyAndStore(
        bytes32 bondId,
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external {
        require(publicInputs.length == 4, "Expected 4 public inputs");
        require(honkVerifier.verify(proof, publicInputs), "ZK proof invalid");

        bonds[bondId] = VerifiedRating({
            ratingIndex: uint8(uint256(publicInputs[0])),
            riskScore: uint8(uint256(publicInputs[1])),
            hasCollateral: uint256(publicInputs[2]) == 1,
            couponRange: uint8(uint256(publicInputs[3])),
            verifiedAt: block.timestamp
        });

        emit RatingIntegrityVerified(
            bondId,
            uint8(uint256(publicInputs[0])),
            uint8(uint256(publicInputs[1])),
            block.timestamp
        );
    }

    function hasValidProof(bytes32 bondId) external view returns (bool) {
        return bonds[bondId].verifiedAt > 0;
    }

    function getVerifiedRating(bytes32 bondId) external view returns (VerifiedRating memory) {
        return bonds[bondId];
    }
}
