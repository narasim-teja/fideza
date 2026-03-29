// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {RaylsErc20Handler} from "rayls-protocol-sdk/tokens/RaylsErc20Handler.sol";
import {InstitutionRegistry} from "./InstitutionRegistry.sol";

/// @title BondToken
/// @notice ERC-20 for fungible corporate bond units. One contract per bond issuance.
///         Full metadata stays on Privacy Node; getDisclosure() returns bucketed/redacted fields.
contract BondToken is RaylsErc20Handler {
    struct BondMetadata {
        string bondId;
        string isin;
        address issuer;
        string issuerName;
        string issuerJurisdiction;
        string issuerSector;
        string issuerCreditRating;
        uint256 parValue;
        string currency;
        uint256 couponRateBps;
        string couponFrequency;
        uint256 issueDate;
        uint256 maturityDate;
        string seniority;
        string collateralType;
        string covenantSummary;
        string callProvision;
        string offeringType;
        uint256 minimumDenomination;
        bool qualifiedBuyerOnly;
        bytes32 termSheetHash;
    }

    struct BondDisclosure {
        string assetType;
        string issuerCategory;
        string seniority;
        string maturityBucket;
        string couponRange;
        string currency;
        uint256 parValue;
        string couponFrequency;
        string creditTier;
        bool hasCollateral;
        string offeringType;
        bool qualifiedBuyerOnly;
    }

    InstitutionRegistry public immutable institutionRegistry;
    BondMetadata private _metadata;
    bool public initialized;

    event BondInitialized(string bondId, address indexed issuer, string currency, uint256 totalSupply);

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

    function initializeBond(BondMetadata calldata metadata, uint256 totalSupply) external {
        require(!initialized, "Already initialized");
        require(institutionRegistry.isApproved(msg.sender), "Not approved institution");
        require(bytes(metadata.bondId).length > 0, "Bond ID required");
        require(totalSupply > 0, "Supply must be > 0");

        initialized = true;
        _metadata = BondMetadata({
            bondId: metadata.bondId,
            isin: metadata.isin,
            issuer: msg.sender,
            issuerName: metadata.issuerName,
            issuerJurisdiction: metadata.issuerJurisdiction,
            issuerSector: metadata.issuerSector,
            issuerCreditRating: metadata.issuerCreditRating,
            parValue: metadata.parValue,
            currency: metadata.currency,
            couponRateBps: metadata.couponRateBps,
            couponFrequency: metadata.couponFrequency,
            issueDate: metadata.issueDate,
            maturityDate: metadata.maturityDate,
            seniority: metadata.seniority,
            collateralType: metadata.collateralType,
            covenantSummary: metadata.covenantSummary,
            callProvision: metadata.callProvision,
            offeringType: metadata.offeringType,
            minimumDenomination: metadata.minimumDenomination,
            qualifiedBuyerOnly: metadata.qualifiedBuyerOnly,
            termSheetHash: metadata.termSheetHash
        });

        _mint(msg.sender, totalSupply);
        emit BondInitialized(metadata.bondId, msg.sender, metadata.currency, totalSupply);
    }

    function getFullMetadata() external view returns (BondMetadata memory) {
        require(initialized, "Not initialized");
        return _metadata;
    }

    function getDisclosure() external view returns (BondDisclosure memory) {
        require(initialized, "Not initialized");
        BondMetadata storage m = _metadata;

        return BondDisclosure({
            assetType: "BOND",
            issuerCategory: _buildIssuerCategory(m.issuerJurisdiction, m.issuerSector, m.issuerCreditRating),
            seniority: m.seniority,
            maturityBucket: _bucketMaturity(m.issueDate, m.maturityDate),
            couponRange: _bucketCoupon(m.couponRateBps),
            currency: m.currency,
            parValue: m.parValue,
            couponFrequency: m.couponFrequency,
            creditTier: _tierCredit(m.issuerCreditRating),
            hasCollateral: bytes(m.collateralType).length > 0,
            offeringType: m.offeringType,
            qualifiedBuyerOnly: m.qualifiedBuyerOnly
        });
    }

    function getAssetId() external view returns (bytes32) {
        require(initialized, "Not initialized");
        return keccak256(bytes(_metadata.bondId));
    }

    // --- Disclosure bucketing helpers ---

    function _buildIssuerCategory(
        string memory jurisdiction,
        string memory sector,
        string memory creditRating
    ) internal pure returns (string memory) {
        string memory tier = _tierCredit(creditRating);
        bytes32 tierHash = keccak256(bytes(tier));
        string memory grade;
        if (tierHash == keccak256("IG")) grade = "Investment Grade";
        else if (tierHash == keccak256("HY")) grade = "High Yield";
        else grade = "Not Rated";

        return string(abi.encodePacked(jurisdiction, " ", sector, ", ", grade));
    }

    function _bucketMaturity(uint256 issueDate, uint256 maturityDate) internal pure returns (string memory) {
        uint256 years_ = (maturityDate - issueDate) / 365 days;
        if (years_ < 2) return "0-2 years";
        if (years_ < 5) return "2-5 years";
        if (years_ < 10) return "5-10 years";
        return "10+ years";
    }

    function _bucketCoupon(uint256 bps) internal pure returns (string memory) {
        if (bps < 300) return "0-3%";
        if (bps < 600) return "3-6%";
        if (bps < 1000) return "6-10%";
        return "10%+";
    }

    function _tierCredit(string memory rating) internal pure returns (string memory) {
        bytes32 h = keccak256(bytes(rating));
        if (
            h == keccak256("AAA") || h == keccak256("AA+") || h == keccak256("AA") ||
            h == keccak256("AA-") || h == keccak256("A+") || h == keccak256("A") ||
            h == keccak256("A-") || h == keccak256("BBB+") || h == keccak256("BBB") ||
            h == keccak256("BBB-")
        ) return "IG";
        if (
            h == keccak256("BB+") || h == keccak256("BB") || h == keccak256("BB-") ||
            h == keccak256("B+") || h == keccak256("B") || h == keccak256("B-")
        ) return "HY";
        return "NR";
    }
}
