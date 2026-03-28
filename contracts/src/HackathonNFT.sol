// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RaylsErc721Handler} from "rayls-protocol-sdk/tokens/RaylsErc721Handler.sol";

/// @title HackathonNFT
/// @notice A bridgeable ERC721 token for the Rayls hackathon.
/// @dev Inherits RaylsErc721Handler which provides:
///   - teleportToPublicChain(to, tokenId, chainId)  — lock on private, mint on public
///   - receiveTeleportFromPublicChain(to, tokenId)   — unlock on private (called by relayer)
///   - mint(to, tokenId)                             — mint new NFT (onlyOwner)
///   - burn(tokenId)                                 — burn NFT (onlyOwner)
///
///   The deployer becomes the contract owner and can mint/burn tokens.
///   Only users registered and approved in RNUserGovernanceV1 can call teleportToPublicChain.
contract HackathonNFT is RaylsErc721Handler {

    /// @param _uri             Base URI for token metadata
    /// @param _name            Token name (e.g. "Hackathon NFT")
    /// @param _symbol          Token symbol (e.g. "HNFT")
    /// @param _endpoint        EndpointV1 address (from DeploymentProxyRegistry: "Endpoint")
    /// @param _raylsNodeEndpoint RNEndpointV1 address (from DeploymentProxyRegistry: "RNEndpoint")
    /// @param _userGovernance  RNUserGovernanceV1 address (from DeploymentProxyRegistry: "RNUserGovernance")
    constructor(
        string memory _uri,
        string memory _name,
        string memory _symbol,
        address _endpoint,
        address _raylsNodeEndpoint,
        address _userGovernance
    )
        RaylsErc721Handler(
            _uri,
            _name,
            _symbol,
            _endpoint,
            _raylsNodeEndpoint,
            _userGovernance,
            msg.sender, // owner = deployer
            false       // isCustom = false
        )
    {
        // Mint token #0 to the deployer.
        // Uses _safeMint (internal) instead of mint() to avoid sending a cross-chain
        // notification before the token has a resourceId assigned.
        _safeMint(msg.sender, 0);
    }
}
