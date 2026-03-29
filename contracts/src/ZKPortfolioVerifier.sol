// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPortfolioVerifier} from "./IPortfolioVerifier.sol";

/// @notice Interface for the Barretenberg-generated HonkVerifier.
interface IHonkVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external returns (bool);
}

/// @title ZKPortfolioVerifier
/// @notice Verifies Noir ZK proofs of portfolio composition.
///         Proves aggregate properties (value, coupon, ratings, diversification)
///         are correctly computed from private bond holdings — the core dark pool proof.
///         Drop-in replacement for AIAttestationVerifier via IPortfolioVerifier.
contract ZKPortfolioVerifier is IPortfolioVerifier, Ownable {

    IHonkVerifier public immutable ultraVerifier;

    struct VerifiedPortfolio {
        uint256 totalValue;
        uint256 weightedCouponBps;
        uint8 numBonds;
        uint8 minRatingIndex;          // worst rating (higher index)
        uint8 maxRatingIndex;          // best rating (lower index)
        uint256 maxSingleExposureBps;
        uint8 diversificationScore;
        uint256 verifiedAt;
    }

    mapping(bytes32 => VerifiedPortfolio) public portfolios;
    bytes32[] public portfolioIds;

    event PortfolioVerified(
        bytes32 indexed portfolioId,
        uint256 totalValue,
        uint8 numBonds,
        uint8 diversificationScore,
        uint256 timestamp
    );
    event ProofInvalidated(bytes32 indexed portfolioId);

    constructor(address _ultraVerifier) Ownable(msg.sender) {
        require(_ultraVerifier != address(0), "Invalid verifier");
        ultraVerifier = IHonkVerifier(_ultraVerifier);
    }

    /// @notice Submit and verify a ZK proof of portfolio composition.
    /// @param portfolioId Unique portfolio identifier.
    /// @param proof The serialized Noir proof bytes.
    /// @param publicInputs 7 public inputs as bytes32[] in circuit order:
    ///   [totalValue, weightedCouponBps, numBonds, minRatingIndex,
    ///    maxRatingIndex, maxSingleExposureBps, diversificationScore]
    function verifyAndStore(
        bytes32 portfolioId,
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external {
        require(portfolioId != bytes32(0), "Invalid portfolioId");
        require(publicInputs.length == 7, "Expected 7 public inputs");

        // On-chain ZK verification
        bool valid = ultraVerifier.verify(proof, publicInputs);
        require(valid, "ZK proof invalid");

        // Decode public inputs
        portfolios[portfolioId] = VerifiedPortfolio({
            totalValue: uint256(publicInputs[0]),
            weightedCouponBps: uint256(publicInputs[1]),
            numBonds: uint8(uint256(publicInputs[2])),
            minRatingIndex: uint8(uint256(publicInputs[3])),
            maxRatingIndex: uint8(uint256(publicInputs[4])),
            maxSingleExposureBps: uint256(publicInputs[5]),
            diversificationScore: uint8(uint256(publicInputs[6])),
            verifiedAt: block.timestamp
        });
        portfolioIds.push(portfolioId);

        emit PortfolioVerified(
            portfolioId,
            uint256(publicInputs[0]),
            uint8(uint256(publicInputs[2])),
            uint8(uint256(publicInputs[6])),
            block.timestamp
        );
    }

    /// @notice IPortfolioVerifier — called by FidezaLendingPool.
    function verifyPortfolio(bytes32 portfolioId) external view override returns (bool valid, uint256 totalValue) {
        VerifiedPortfolio storage p = portfolios[portfolioId];
        if (p.verifiedAt == 0) {
            return (false, 0);
        }
        return (true, p.totalValue);
    }

    /// @notice Get full verified portfolio details.
    function getVerifiedPortfolio(bytes32 portfolioId) external view returns (VerifiedPortfolio memory) {
        require(portfolios[portfolioId].verifiedAt > 0, "Not verified");
        return portfolios[portfolioId];
    }

    /// @notice Owner can invalidate a stale proof.
    function invalidateProof(bytes32 portfolioId) external onlyOwner {
        portfolios[portfolioId].verifiedAt = 0;
        emit ProofInvalidated(portfolioId);
    }

    function hasValidProof(bytes32 portfolioId) external view returns (bool) {
        return portfolios[portfolioId].verifiedAt > 0;
    }

    function getPortfolioCount() external view returns (uint256) {
        return portfolioIds.length;
    }
}
