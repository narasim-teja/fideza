// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {RaylsErc20Handler} from "rayls-protocol-sdk/tokens/RaylsErc20Handler.sol";
import {InstitutionRegistry} from "./InstitutionRegistry.sol";

/// @title ABSToken
/// @notice ERC-20 for ABS tranche units. Stores individual loan pool data privately.
///         Individual loan data NEVER leaves the Privacy Node.
///         getPoolAggregates() computes privacy-preserving statistics on-the-fly.
contract ABSToken is RaylsErc20Handler {
    struct LoanData {
        string loanId;
        string borrowerRegion;
        uint256 creditScore;
        uint256 loanAmount;
        uint256 interestRateBps;
        uint256 remainingTermMonths;
        uint8 delinquencyStatus; // 0=current, 1=30d, 2=60d, 3=90d+
    }

    struct ABSMetadata {
        string absId;
        address issuer;
        string poolType;
        uint256 totalPoolSize;
        uint256 totalPoolNotional;
        string trancheName;
        string trancheSeniority;
        uint256 trancheSize;
        uint256 creditEnhancementBps;
        uint256 subordinationLevelBps;
        string currency;
        uint256 expectedMaturity;
        string servicerName;
        string auditorName;
        bytes32 offeringCircularHash;
        bytes32 poolTapeHash;
    }

    struct PoolAggregates {
        uint256 poolSize;
        uint256 totalNotional;
        string avgCreditScoreRange;
        string weightedAvgTermBucket;
        string delinquencyRateBucket;
    }

    struct ABSDisclosure {
        string assetType;
        string poolType;
        string poolSizeBucket;
        string trancheSeniority;
        uint256 creditEnhancementBps;
        uint256 subordinationLevelBps;
        string currency;
        string maturityBucket;
        PoolAggregates poolAggregates;
    }

    InstitutionRegistry public immutable institutionRegistry;
    ABSMetadata private _metadata;
    LoanData[] private _loanPool; // NEVER exposed directly
    bool public initialized;

    event ABSInitialized(string absId, address indexed issuer, string poolType, uint256 trancheSupply, uint256 poolSize);

    constructor(
        string memory _name,
        string memory _symbol,
        address _endpoint,
        address _raylsNodeEndpoint,
        address _userGovernance,
        address _institutionRegistry
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
        institutionRegistry = InstitutionRegistry(_institutionRegistry);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function initializeABS(
        ABSMetadata calldata metadata,
        LoanData[] calldata loans,
        uint256 trancheSupply
    ) external {
        require(!initialized, "Already initialized");
        require(institutionRegistry.isApproved(msg.sender), "Not approved institution");
        require(bytes(metadata.absId).length > 0, "ABS ID required");
        require(loans.length > 0, "Loans required");
        require(trancheSupply > 0, "Supply must be > 0");

        initialized = true;
        _metadata = ABSMetadata({
            absId: metadata.absId,
            issuer: msg.sender,
            poolType: metadata.poolType,
            totalPoolSize: metadata.totalPoolSize,
            totalPoolNotional: metadata.totalPoolNotional,
            trancheName: metadata.trancheName,
            trancheSeniority: metadata.trancheSeniority,
            trancheSize: metadata.trancheSize,
            creditEnhancementBps: metadata.creditEnhancementBps,
            subordinationLevelBps: metadata.subordinationLevelBps,
            currency: metadata.currency,
            expectedMaturity: metadata.expectedMaturity,
            servicerName: metadata.servicerName,
            auditorName: metadata.auditorName,
            offeringCircularHash: metadata.offeringCircularHash,
            poolTapeHash: metadata.poolTapeHash
        });

        for (uint256 i = 0; i < loans.length; i++) {
            _loanPool.push(loans[i]);
        }

        _mint(msg.sender, trancheSupply);
        emit ABSInitialized(metadata.absId, msg.sender, metadata.poolType, trancheSupply, loans.length);
    }

    function getFullMetadata() external view returns (ABSMetadata memory) {
        require(initialized, "Not initialized");
        return _metadata;
    }

    function getPoolAggregates() external view returns (PoolAggregates memory) {
        require(initialized, "Not initialized");
        uint256 len = _loanPool.length;

        uint256 weightedCreditSum;
        uint256 weightedTermSum;
        uint256 totalAmount;
        uint256 delinquentCount;

        for (uint256 i = 0; i < len; i++) {
            LoanData storage loan = _loanPool[i];
            weightedCreditSum += loan.creditScore * loan.loanAmount;
            weightedTermSum += loan.remainingTermMonths * loan.loanAmount;
            totalAmount += loan.loanAmount;
            if (loan.delinquencyStatus > 0) {
                delinquentCount++;
            }
        }

        uint256 avgCreditScore = totalAmount > 0 ? weightedCreditSum / totalAmount : 0;
        uint256 avgTermMonths = totalAmount > 0 ? weightedTermSum / totalAmount : 0;
        uint256 delinquencyRateBps = len > 0 ? (delinquentCount * 10000) / len : 0;

        return PoolAggregates({
            poolSize: len,
            totalNotional: totalAmount,
            avgCreditScoreRange: _bucketCreditScore(avgCreditScore),
            weightedAvgTermBucket: _bucketTerm(avgTermMonths),
            delinquencyRateBucket: _bucketDelinquency(delinquencyRateBps)
        });
    }

    function getDisclosure() external view returns (ABSDisclosure memory) {
        require(initialized, "Not initialized");
        ABSMetadata storage m = _metadata;

        // Compute pool aggregates inline
        uint256 len = _loanPool.length;
        uint256 weightedCreditSum;
        uint256 weightedTermSum;
        uint256 totalAmount;
        uint256 delinquentCount;

        for (uint256 i = 0; i < len; i++) {
            LoanData storage loan = _loanPool[i];
            weightedCreditSum += loan.creditScore * loan.loanAmount;
            weightedTermSum += loan.remainingTermMonths * loan.loanAmount;
            totalAmount += loan.loanAmount;
            if (loan.delinquencyStatus > 0) delinquentCount++;
        }

        uint256 avgCredit = totalAmount > 0 ? weightedCreditSum / totalAmount : 0;
        uint256 avgTerm = totalAmount > 0 ? weightedTermSum / totalAmount : 0;
        uint256 delinqBps = len > 0 ? (delinquentCount * 10000) / len : 0;

        return ABSDisclosure({
            assetType: "ABS_TRANCHE",
            poolType: m.poolType,
            poolSizeBucket: _bucketPoolSize(len),
            trancheSeniority: m.trancheSeniority,
            creditEnhancementBps: m.creditEnhancementBps,
            subordinationLevelBps: m.subordinationLevelBps,
            currency: m.currency,
            maturityBucket: _bucketMaturity(m.expectedMaturity),
            poolAggregates: PoolAggregates({
                poolSize: len,
                totalNotional: totalAmount,
                avgCreditScoreRange: _bucketCreditScore(avgCredit),
                weightedAvgTermBucket: _bucketTerm(avgTerm),
                delinquencyRateBucket: _bucketDelinquency(delinqBps)
            })
        });
    }

    function getAssetId() external view returns (bytes32) {
        require(initialized, "Not initialized");
        return keccak256(bytes(_metadata.absId));
    }

    // --- Bucketing helpers ---

    function _bucketCreditScore(uint256 score) internal pure returns (string memory) {
        if (score < 620) return "Subprime (<620)";
        if (score < 680) return "Near-prime (620-679)";
        if (score < 740) return "Prime (680-739)";
        return "Super-prime (740+)";
    }

    function _bucketTerm(uint256 months) internal pure returns (string memory) {
        if (months < 24) return "Short (<24 months)";
        if (months < 48) return "Medium (24-48 months)";
        return "Long (48+ months)";
    }

    function _bucketDelinquency(uint256 rateBps) internal pure returns (string memory) {
        if (rateBps < 100) return "<1%";
        if (rateBps < 300) return "1-3%";
        if (rateBps < 500) return "3-5%";
        return ">5%";
    }

    function _bucketPoolSize(uint256 size) internal pure returns (string memory) {
        if (size < 50) return "<50 loans";
        if (size < 100) return "50-100 loans";
        if (size < 500) return "100-500 loans";
        return "500+ loans";
    }

    function _bucketMaturity(uint256 maturityTimestamp) internal view returns (string memory) {
        if (maturityTimestamp <= block.timestamp) return "Matured";
        uint256 years_ = (maturityTimestamp - block.timestamp) / 365 days;
        if (years_ < 2) return "0-2 years";
        if (years_ < 5) return "2-5 years";
        return "5+ years";
    }
}
