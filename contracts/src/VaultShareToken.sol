// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RaylsErc20Handler} from "rayls-protocol-sdk/tokens/RaylsErc20Handler.sol";

/// @title VaultShareToken
/// @notice Bridgeable ERC-20 representing portfolio vault shares.
///         Extends RaylsErc20Handler for cross-chain teleport to public chain.
///         One token per portfolio. Composition stays private on Privacy Node.
contract VaultShareToken is RaylsErc20Handler {
    bytes32 public portfolioId;

    event VaultSharesMinted(bytes32 indexed portfolioId, address indexed to, uint256 amount);

    constructor(
        string memory _name,
        string memory _symbol,
        bytes32 _portfolioId,
        uint256 _totalShares,
        address _endpoint,
        address _raylsNodeEndpoint,
        address _userGovernance
    )
        RaylsErc20Handler(
            _name,
            _symbol,
            _endpoint,
            _raylsNodeEndpoint,
            _userGovernance,
            msg.sender,
            false
        )
    {
        portfolioId = _portfolioId;
        _mint(msg.sender, _totalShares);
        emit VaultSharesMinted(_portfolioId, msg.sender, _totalShares);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
