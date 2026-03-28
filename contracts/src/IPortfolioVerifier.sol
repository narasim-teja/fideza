// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IPortfolioVerifier
/// @notice ZK-ready interface for portfolio verification.
///         AI attestation today, ZK proof tomorrow — same interface.
interface IPortfolioVerifier {
    /// @notice Verify a portfolio and return its attested total value.
    /// @param portfolioId The unique portfolio identifier.
    /// @return valid Whether the portfolio has a valid attestation/proof.
    /// @return totalValue The attested total value of the portfolio.
    function verifyPortfolio(bytes32 portfolioId) external view returns (bool valid, uint256 totalValue);
}
