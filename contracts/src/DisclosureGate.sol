// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ComplianceStore} from "./ComplianceStore.sol";

/// @title DisclosureGate
/// @notice Enforces AI approval + human governance sign-off before asset disclosure/bridging.
contract DisclosureGate is Ownable {
    struct DisclosureApproval {
        bytes32 disclosedFieldsHash;
        uint256 approvedAt;
        bool approved;
    }

    ComplianceStore public immutable complianceStore;
    address public governanceAdmin;
    mapping(bytes32 => DisclosureApproval) private _approvals;

    event DisclosureApproved(bytes32 indexed assetId, bytes32 disclosedFieldsHash);
    event DisclosureRevoked(bytes32 indexed assetId);
    event GovernanceAdminChanged(address indexed newAdmin);

    modifier onlyGovernanceAdmin() {
        require(msg.sender == governanceAdmin, "Not governance admin");
        _;
    }

    constructor(address _complianceStore, address _governanceAdmin) Ownable(msg.sender) {
        require(_complianceStore != address(0), "Invalid compliance store");
        require(_governanceAdmin != address(0), "Invalid governance admin");
        complianceStore = ComplianceStore(_complianceStore);
        governanceAdmin = _governanceAdmin;
    }

    function approveDisclosure(bytes32 assetId, bytes32 disclosedFieldsHash) external onlyGovernanceAdmin {
        require(complianceStore.isApproved(assetId), "AI compliance not approved");
        require(!_approvals[assetId].approved, "Already approved");

        _approvals[assetId] = DisclosureApproval({
            disclosedFieldsHash: disclosedFieldsHash,
            approvedAt: block.timestamp,
            approved: true
        });

        emit DisclosureApproved(assetId, disclosedFieldsHash);
    }

    function revokeDisclosure(bytes32 assetId) external onlyGovernanceAdmin {
        require(_approvals[assetId].approved, "Not approved");
        _approvals[assetId].approved = false;
        emit DisclosureRevoked(assetId);
    }

    function isDisclosureApproved(bytes32 assetId) external view returns (bool) {
        return _approvals[assetId].approved;
    }

    function getApproval(bytes32 assetId) external view returns (DisclosureApproval memory) {
        return _approvals[assetId];
    }

    function setGovernanceAdmin(address _governanceAdmin) external onlyOwner {
        require(_governanceAdmin != address(0), "Invalid governance admin");
        governanceAdmin = _governanceAdmin;
        emit GovernanceAdminChanged(_governanceAdmin);
    }
}
