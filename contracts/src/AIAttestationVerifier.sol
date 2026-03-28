// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IPortfolioVerifier} from "./IPortfolioVerifier.sol";
import {PortfolioAttestation} from "./PortfolioAttestation.sol";

/// @title AIAttestationVerifier
/// @notice Implements IPortfolioVerifier by reading from PortfolioAttestation.
///         AI attestation today, ZK proof tomorrow — swap this for a ZK verifier.
contract AIAttestationVerifier is IPortfolioVerifier {
    PortfolioAttestation public immutable attestationContract;

    constructor(address _portfolioAttestation) {
        require(_portfolioAttestation != address(0), "Invalid attestation address");
        attestationContract = PortfolioAttestation(_portfolioAttestation);
    }

    /// @notice Verify a portfolio by checking for a valid AI attestation.
    /// @param portfolioId The portfolio to verify.
    /// @return valid True if a valid attestation exists.
    /// @return totalValue The attested total value of the portfolio.
    function verifyPortfolio(bytes32 portfolioId) external view override returns (bool valid, uint256 totalValue) {
        if (!attestationContract.hasValidAttestation(portfolioId)) {
            return (false, 0);
        }
        totalValue = attestationContract.getAttestedValue(portfolioId);
        return (true, totalValue);
    }
}
