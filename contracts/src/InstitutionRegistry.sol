// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title InstitutionRegistry
/// @notice KYB registry for issuing institutions on the Fideza platform.
contract InstitutionRegistry is Ownable {
    enum InstitutionStatus { PENDING, VERIFIED, APPROVED, SUSPENDED }

    struct Institution {
        string name;
        string registrationNumber;
        string jurisdiction;
        string businessType;
        bytes32 kybDocHash;
        uint256 registeredAt;
    }

    mapping(address => Institution) private _institutions;
    mapping(address => InstitutionStatus) private _status;

    event InstitutionRegistered(address indexed institution, string name, string jurisdiction);
    event InstitutionStatusChanged(address indexed institution, InstitutionStatus newStatus);

    constructor() Ownable(msg.sender) {}

    function registerInstitution(
        string calldata name,
        string calldata registrationNumber,
        string calldata jurisdiction,
        string calldata businessType,
        bytes32 kybDocHash
    ) external {
        require(bytes(_institutions[msg.sender].name).length == 0, "Already registered");
        require(bytes(name).length > 0, "Name required");

        _institutions[msg.sender] = Institution({
            name: name,
            registrationNumber: registrationNumber,
            jurisdiction: jurisdiction,
            businessType: businessType,
            kybDocHash: kybDocHash,
            registeredAt: block.timestamp
        });
        _status[msg.sender] = InstitutionStatus.PENDING;

        emit InstitutionRegistered(msg.sender, name, jurisdiction);
    }

    function updateStatus(address institution, InstitutionStatus status) external onlyOwner {
        require(bytes(_institutions[institution].name).length > 0, "Not registered");
        _status[institution] = status;
        emit InstitutionStatusChanged(institution, status);
    }

    function isApproved(address institution) external view returns (bool) {
        return _status[institution] == InstitutionStatus.APPROVED;
    }

    function getInstitution(address institution) external view returns (Institution memory) {
        return _institutions[institution];
    }

    function getStatus(address institution) external view returns (InstitutionStatus) {
        return _status[institution];
    }
}
