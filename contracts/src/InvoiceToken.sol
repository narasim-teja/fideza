// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RaylsErc20Handler} from "rayls-protocol-sdk/tokens/RaylsErc20Handler.sol";
import {InstitutionRegistry} from "./InstitutionRegistry.sol";

/// @title InvoiceToken
/// @notice ERC-20 for a single trade receivable invoice. One contract per invoice.
///         Full metadata stays on Privacy Node; getDisclosure() returns bucketed/redacted fields.
///         Supply represents fractional shares of the invoice's face value.
contract InvoiceToken is RaylsErc20Handler {
    struct InvoiceMetadata {
        string invoiceId;
        address issuer;
        string debtorName;
        string debtorJurisdiction;
        string debtorCreditRating;
        string debtorIndustry;
        uint256 faceValue;
        string currency;
        uint256 issueDate;
        uint256 dueDate;
        string paymentTerms;
        string recourseType;
        bool priorityClaim;
        bytes32 invoiceDocHash;
        bool previouslyTokenized;
    }

    struct InvoiceDisclosure {
        string assetType;
        string maturityBucket;
        string currency;
        string notionalRange;
        string debtorIndustry;
        string debtorCreditTier;
        string recourseType;
        uint256 riskScore;
        bool priorityClaim;
    }

    InstitutionRegistry public immutable institutionRegistry;
    InvoiceMetadata private _metadata;
    bool public initialized;

    event InvoiceInitialized(string invoiceId, address indexed issuer, string currency, uint256 totalSupply);

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

    function initializeInvoice(InvoiceMetadata calldata metadata, uint256 totalSupply) external {
        require(!initialized, "Already initialized");
        require(institutionRegistry.isApproved(msg.sender), "Not approved institution");
        require(bytes(metadata.invoiceId).length > 0, "Invoice ID required");
        require(totalSupply > 0, "Supply must be > 0");

        initialized = true;
        _metadata = InvoiceMetadata({
            invoiceId: metadata.invoiceId,
            issuer: msg.sender,
            debtorName: metadata.debtorName,
            debtorJurisdiction: metadata.debtorJurisdiction,
            debtorCreditRating: metadata.debtorCreditRating,
            debtorIndustry: metadata.debtorIndustry,
            faceValue: metadata.faceValue,
            currency: metadata.currency,
            issueDate: metadata.issueDate,
            dueDate: metadata.dueDate,
            paymentTerms: metadata.paymentTerms,
            recourseType: metadata.recourseType,
            priorityClaim: metadata.priorityClaim,
            invoiceDocHash: metadata.invoiceDocHash,
            previouslyTokenized: metadata.previouslyTokenized
        });

        _mint(msg.sender, totalSupply);
        emit InvoiceInitialized(metadata.invoiceId, msg.sender, metadata.currency, totalSupply);
    }

    function getFullMetadata() external view returns (InvoiceMetadata memory) {
        require(initialized, "Not initialized");
        return _metadata;
    }

    function getDisclosure() external view returns (InvoiceDisclosure memory) {
        require(initialized, "Not initialized");
        InvoiceMetadata storage m = _metadata;

        return InvoiceDisclosure({
            assetType: "INVOICE",
            maturityBucket: _bucketMaturity(m.issueDate, m.dueDate),
            currency: m.currency,
            notionalRange: _bucketFaceValue(m.faceValue),
            debtorIndustry: m.debtorIndustry,
            debtorCreditTier: _tierCreditRating(m.debtorCreditRating),
            recourseType: m.recourseType,
            riskScore: 0, // Set by AI agent off-chain
            priorityClaim: m.priorityClaim
        });
    }

    function getAssetId() external view returns (bytes32) {
        require(initialized, "Not initialized");
        return keccak256(bytes(_metadata.invoiceId));
    }

    // --- Disclosure bucketing helpers ---

    function _bucketFaceValue(uint256 value) internal pure returns (string memory) {
        if (value < 5_000_000e18) return "0-5M";
        if (value < 25_000_000e18) return "5M-25M";
        if (value < 100_000_000e18) return "25M-100M";
        return "100M+";
    }

    function _bucketMaturity(uint256 issueDate, uint256 dueDate) internal pure returns (string memory) {
        uint256 days_ = (dueDate - issueDate) / 1 days;
        if (days_ < 30) return "0-30 days";
        if (days_ < 60) return "30-60 days";
        if (days_ < 90) return "60-90 days";
        if (days_ < 180) return "90-180 days";
        return "180+ days";
    }

    function _tierCreditRating(string memory rating) internal pure returns (string memory) {
        bytes32 h = keccak256(bytes(rating));
        // Investment grade: AAA, AA+, AA, AA-, A+, A, A-, BBB+, BBB, BBB-
        if (
            h == keccak256("AAA") || h == keccak256("AA+") || h == keccak256("AA") ||
            h == keccak256("AA-") || h == keccak256("A+") || h == keccak256("A") ||
            h == keccak256("A-") || h == keccak256("BBB+") || h == keccak256("BBB") ||
            h == keccak256("BBB-")
        ) return "A";
        // High yield: BB+, BB, BB-, B+, B, B-
        if (
            h == keccak256("BB+") || h == keccak256("BB") || h == keccak256("BB-") ||
            h == keccak256("B+") || h == keccak256("B") || h == keccak256("B-")
        ) return "B";
        // Speculative / distressed
        return "C";
    }
}
