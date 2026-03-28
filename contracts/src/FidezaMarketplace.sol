// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title FidezaMarketplace
/// @notice Public marketplace for Fideza receipt tokens, PT, and YT.
///         Anyone can list ERC-20 tokens with RWA metadata. Buyers pay in USDr (native token).
///         Tokens are held in escrow until purchased or delisted.
contract FidezaMarketplace {

    enum TokenType { RECEIPT, PT, YT }

    struct Listing {
        address token;
        uint256 amount;
        uint256 price;          // Price in USDr (native token)
        bool active;
        address seller;
    }

    struct ListingMetadata {
        bytes32 assetId;
        TokenType tokenType;
        string disclosureURI;
        bytes32 complianceReportHash;
    }

    uint256 public nextListingId;
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => ListingMetadata) public listingMetadata;
    mapping(uint8 => uint256[]) private _listingsByTokenType;

    event Listed(uint256 indexed listingId, address indexed token, TokenType tokenType, uint256 price, address seller);
    event Updated(uint256 indexed listingId, uint256 newPrice);
    event Delisted(uint256 indexed listingId);
    event Bought(uint256 indexed listingId, address indexed buyer, uint256 price);

    /// @notice List an ERC-20 token (receipt, PT, or YT) with RWA metadata.
    ///         Caller must approve this contract to spend tokens first.
    function listWithMetadata(
        address token,
        uint256 amount,
        uint256 price,
        ListingMetadata calldata metadata
    ) external returns (uint256 listingId) {
        require(price > 0, "Price must be > 0");
        require(amount > 0, "Amount must be > 0");

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        listingId = nextListingId++;
        listings[listingId] = Listing({
            token: token,
            amount: amount,
            price: price,
            active: true,
            seller: msg.sender
        });
        listingMetadata[listingId] = metadata;
        _listingsByTokenType[uint8(metadata.tokenType)].push(listingId);

        emit Listed(listingId, token, metadata.tokenType, price, msg.sender);
    }

    /// @notice Update the price of an active listing. Seller only.
    function updatePrice(uint256 listingId, uint256 newPrice) external {
        Listing storage l = listings[listingId];
        require(l.active, "Not active");
        require(msg.sender == l.seller, "Not seller");
        require(newPrice > 0, "Price must be > 0");
        l.price = newPrice;
        emit Updated(listingId, newPrice);
    }

    /// @notice Delist and return tokens to seller.
    function delist(uint256 listingId) external {
        Listing storage l = listings[listingId];
        require(l.active, "Not active");
        require(msg.sender == l.seller, "Not seller");
        l.active = false;

        IERC20(l.token).transfer(l.seller, l.amount);
        emit Delisted(listingId);
    }

    /// @notice Buy a listed asset. Send USDr >= price.
    function buy(uint256 listingId) external payable {
        Listing storage l = listings[listingId];
        require(l.active, "Not active");
        require(msg.value >= l.price, "Insufficient payment");

        l.active = false;

        IERC20(l.token).transfer(msg.sender, l.amount);

        (bool sent,) = l.seller.call{value: msg.value}("");
        require(sent, "USDr transfer failed");

        emit Bought(listingId, msg.sender, msg.value);
    }

    // ── Views ───────────��───────────────────────────────────────────────

    function getListingWithMetadata(uint256 listingId)
        external view returns (Listing memory, ListingMetadata memory)
    {
        return (listings[listingId], listingMetadata[listingId]);
    }

    function getListingsByTokenType(TokenType tokenType)
        external view returns (uint256[] memory)
    {
        return _listingsByTokenType[uint8(tokenType)];
    }

    function getActiveListings() external view returns (uint256[] memory) {
        uint256 count;
        for (uint256 i; i < nextListingId; i++) {
            if (listings[i].active) count++;
        }
        uint256[] memory result = new uint256[](count);
        uint256 idx;
        for (uint256 i; i < nextListingId; i++) {
            if (listings[i].active) result[idx++] = i;
        }
        return result;
    }
}
