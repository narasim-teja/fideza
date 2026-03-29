// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {RaylsErc1155Handler} from "rayls-protocol-sdk/tokens/RaylsErc1155Handler.sol";

/// @title HackathonMultiToken
/// @notice A bridgeable ERC1155 multi-token for the Rayls hackathon.
/// @dev Inherits RaylsErc1155Handler which provides:
///   - teleportToPublicChain(to, id, amount, chainId, data) — lock on private, mint on public
///   - receiveTeleportFromPublicChain(to, id, amount)        — unlock on private (called by relayer)
///   - mint(to, id, amount, data)                            — mint new tokens (onlyOwner)
///   - burn(from, id, amount)                                — burn tokens (onlyOwner)
///
///   The deployer becomes the contract owner and can mint/burn tokens.
///   Only users registered and approved in RNUserGovernanceV1 can call teleportToPublicChain.
contract HackathonMultiToken is RaylsErc1155Handler {

    /// @param _uri             Base URI for token metadata
    /// @param _name            Collection name (e.g. "Hackathon Multi Token")
    /// @param _endpoint        EndpointV1 address (from DeploymentProxyRegistry: "Endpoint")
    /// @param _raylsNodeEndpoint RNEndpointV1 address (from DeploymentProxyRegistry: "RNEndpoint")
    /// @param _userGovernance  RNUserGovernanceV1 address (from DeploymentProxyRegistry: "RNUserGovernance")
    constructor(
        string memory _uri,
        string memory _name,
        address _endpoint,
        address _raylsNodeEndpoint,
        address _userGovernance
    )
        RaylsErc1155Handler(
            _uri,
            _name,
            _endpoint,
            _raylsNodeEndpoint,
            _userGovernance,
            msg.sender, // owner = deployer
            false       // isCustom = false
        )
    {
        // Mint 1000 units of token ID 0 to the deployer.
        // Uses _mint (internal) instead of mint() to avoid sending a cross-chain
        // notification before the token has a resourceId assigned.
        _mint(msg.sender, 0, 1000, "");
    }
}
