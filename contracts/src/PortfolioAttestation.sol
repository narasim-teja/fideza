// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title PortfolioAttestation
/// @notice Stores AI-signed attestations of portfolio aggregate properties on the public chain.
///         ECDSA verification ensures only the authorized agent can submit attestations.
///         Follows the same signing pattern as ComplianceStore.sol.
contract PortfolioAttestation is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct Attestation {
        bytes32 portfolioId;
        uint256 totalValue;
        uint256 weightedCouponBps;
        uint8 numBonds;
        uint8 diversificationScore;
        bytes32 methodologyHash;
        bytes agentSignature;
        uint256 timestamp;
    }

    mapping(bytes32 => Attestation) private _attestations;
    bytes32[] private _portfolioIds;
    address public agentAddress;

    event AttestationSubmitted(
        bytes32 indexed portfolioId,
        uint256 totalValue,
        uint8 numBonds,
        uint8 diversificationScore,
        uint256 timestamp
    );

    constructor(address _agentAddress) Ownable(msg.sender) {
        require(_agentAddress != address(0), "Invalid agent address");
        agentAddress = _agentAddress;
    }

    /// @notice Submit a signed portfolio attestation.
    ///         The signature is verified against the stored agent address.
    ///         Signing scheme must match attestor.ts:
    ///           messageHash = keccak256(solidityPacked([bytes32, uint256, uint256, uint8, uint8, bytes32], [...]))
    ///           signature = wallet.signMessage(getBytes(messageHash))
    function submitAttestation(
        bytes32 portfolioId,
        uint256 totalValue,
        uint256 weightedCouponBps,
        uint8 numBonds,
        uint8 diversificationScore,
        bytes32 methodologyHash,
        bytes calldata agentSignature
    ) external {
        require(portfolioId != bytes32(0), "Invalid portfolioId");
        require(totalValue > 0, "Invalid totalValue");
        require(_attestations[portfolioId].timestamp == 0, "Attestation already exists");

        // Reconstruct message hash — must match attestor.ts solidityPacked
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                portfolioId,
                totalValue,
                weightedCouponBps,
                numBonds,
                diversificationScore,
                methodologyHash
            )
        );

        // Verify EIP-191 signed message
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recovered = ethSignedHash.recover(agentSignature);
        require(recovered == agentAddress, "Invalid agent signature");

        _attestations[portfolioId] = Attestation({
            portfolioId: portfolioId,
            totalValue: totalValue,
            weightedCouponBps: weightedCouponBps,
            numBonds: numBonds,
            diversificationScore: diversificationScore,
            methodologyHash: methodologyHash,
            agentSignature: agentSignature,
            timestamp: block.timestamp
        });
        _portfolioIds.push(portfolioId);

        emit AttestationSubmitted(portfolioId, totalValue, numBonds, diversificationScore, block.timestamp);
    }

    /// @notice Get the full attestation for a portfolio.
    function getAttestation(bytes32 portfolioId) external view returns (Attestation memory) {
        require(_attestations[portfolioId].timestamp > 0, "No attestation found");
        return _attestations[portfolioId];
    }

    /// @notice Check if a valid attestation exists for a portfolio.
    function hasValidAttestation(bytes32 portfolioId) external view returns (bool) {
        return _attestations[portfolioId].timestamp > 0;
    }

    /// @notice Get the attested total value for a portfolio.
    function getAttestedValue(bytes32 portfolioId) external view returns (uint256) {
        return _attestations[portfolioId].totalValue;
    }

    /// @notice Get all portfolio IDs that have been attested.
    function getAllPortfolioIds() external view returns (bytes32[] memory) {
        return _portfolioIds;
    }

    /// @notice Get the number of attested portfolios.
    function getPortfolioCount() external view returns (uint256) {
        return _portfolioIds.length;
    }

    /// @notice Update the authorized agent address.
    function setAgentAddress(address _agentAddress) external onlyOwner {
        require(_agentAddress != address(0), "Invalid agent address");
        agentAddress = _agentAddress;
    }
}
