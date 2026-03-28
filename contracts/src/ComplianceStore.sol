// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title ComplianceStore
/// @notice Stores AI compliance report attestations with ECDSA signature verification.
contract ComplianceStore is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    enum Recommendation { REJECT, APPROVE, ESCALATE }

    struct ComplianceAttestation {
        bytes32 assetId;
        bytes32 reportHash;
        bytes32 policyVersionHash;
        bytes agentSignature;
        Recommendation recommendation;
        uint256 riskScore;
        bytes32 disclosureSchemaHash;
        uint256 timestamp;
    }

    mapping(bytes32 => ComplianceAttestation) private _attestations;
    address public agentAddress;

    event AttestationSubmitted(
        bytes32 indexed assetId,
        bytes32 reportHash,
        Recommendation recommendation,
        uint256 riskScore
    );

    constructor(address _agentAddress) Ownable(msg.sender) {
        require(_agentAddress != address(0), "Invalid agent address");
        agentAddress = _agentAddress;
    }

    function submitAttestation(
        bytes32 assetId,
        bytes32 reportHash,
        bytes32 policyVersionHash,
        bytes calldata agentSignature,
        Recommendation recommendation,
        uint256 riskScore,
        bytes32 disclosureSchemaHash
    ) external {
        require(riskScore <= 100, "Risk score must be 0-100");
        require(_attestations[assetId].timestamp == 0, "Attestation already exists");

        // Verify the agent signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                assetId,
                reportHash,
                policyVersionHash,
                uint8(recommendation),
                riskScore,
                disclosureSchemaHash
            )
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recovered = ethSignedHash.recover(agentSignature);
        require(recovered == agentAddress, "Invalid agent signature");

        _attestations[assetId] = ComplianceAttestation({
            assetId: assetId,
            reportHash: reportHash,
            policyVersionHash: policyVersionHash,
            agentSignature: agentSignature,
            recommendation: recommendation,
            riskScore: riskScore,
            disclosureSchemaHash: disclosureSchemaHash,
            timestamp: block.timestamp
        });

        emit AttestationSubmitted(assetId, reportHash, recommendation, riskScore);
    }

    function isApproved(bytes32 assetId) external view returns (bool) {
        return _attestations[assetId].recommendation == Recommendation.APPROVE
            && _attestations[assetId].timestamp > 0;
    }

    function getAttestation(bytes32 assetId) external view returns (ComplianceAttestation memory) {
        return _attestations[assetId];
    }

    function setAgentAddress(address _agentAddress) external onlyOwner {
        require(_agentAddress != address(0), "Invalid agent address");
        agentAddress = _agentAddress;
    }
}
