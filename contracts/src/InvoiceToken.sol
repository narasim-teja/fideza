// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RaylsErc721Handler} from "rayls-protocol-sdk/tokens/RaylsErc721Handler.sol";
import {InstitutionRegistry} from "./InstitutionRegistry.sol";

/// @title InvoiceToken
/// @notice ERC-721 for unique trade receivable invoices. Each tokenId = one invoice.
///         Full metadata stays on Privacy Node; getDisclosure() returns bucketed/redacted fields.
contract InvoiceToken is RaylsErc721Handler {
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
    uint256 public nextTokenId = 1;
    mapping(uint256 => InvoiceMetadata) private _metadata;

    event InvoiceMinted(uint256 indexed tokenId, string invoiceId, address indexed issuer);

    constructor(
        string memory _uri,
        string memory _name,
        string memory _symbol,
        address _endpoint,
        address _raylsNodeEndpoint,
        address _userGovernance,
        address _institutionRegistry
    )
        RaylsErc721Handler(
            _uri,
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

    function mintInvoice(InvoiceMetadata calldata metadata) external returns (uint256) {
        require(institutionRegistry.isApproved(msg.sender), "Not approved institution");
        require(bytes(metadata.invoiceId).length > 0, "Invoice ID required");

        uint256 tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);

        _metadata[tokenId] = InvoiceMetadata({
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

        emit InvoiceMinted(tokenId, metadata.invoiceId, msg.sender);
        return tokenId;
    }

    function getFullMetadata(uint256 tokenId) external view returns (InvoiceMetadata memory) {
        require(_metadata[tokenId].issueDate > 0, "Token does not exist");
        return _metadata[tokenId];
    }

    function getDisclosure(uint256 tokenId) external view returns (InvoiceDisclosure memory) {
        InvoiceMetadata storage m = _metadata[tokenId];
        require(m.issueDate > 0, "Token does not exist");

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

    function getAssetId(uint256 tokenId) external view returns (bytes32) {
        require(_metadata[tokenId].issueDate > 0, "Token does not exist");
        return keccak256(bytes(_metadata[tokenId].invoiceId));
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
