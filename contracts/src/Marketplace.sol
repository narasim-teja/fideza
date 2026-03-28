// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title Marketplace
/// @notice Escrow marketplace for bridged assets on the public chain.
///         Each team deploys their own instance. Owner lists tokens, anyone can buy.
///         Tokens are held in escrow until purchased or delisted.
contract Marketplace is Ownable {

    enum AssetType { ERC20, ERC721 }

    struct Listing {
        address token;
        AssetType assetType;
        uint256 tokenId;    // ERC721 only (0 for ERC20)
        uint256 amount;     // ERC20 only (1 for ERC721)
        uint256 price;      // Price in USDR (native token)
        bool active;
    }

    uint256 public nextListingId;
    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed listingId, address indexed token, AssetType assetType, uint256 price);
    event Updated(uint256 indexed listingId, uint256 newPrice);
    event Delisted(uint256 indexed listingId);
    event Bought(uint256 indexed listingId, address indexed buyer, uint256 price);

    constructor() Ownable(msg.sender) {}

    // ── Owner CRUD ──────────────────────────────────────────────────────

    /// @notice List tokens for sale. Transfers tokens from owner into escrow.
    ///         Owner must approve this contract first.
    /// @param token Mirror token contract on the public chain
    /// @param assetType ERC20 or ERC721
    /// @param tokenId Token ID (ERC721 only, use 0 for ERC20)
    /// @param amount Amount (ERC20 only, use 1 for ERC721)
    /// @param price Price in USDR (native token)
    function list(
        address token,
        AssetType assetType,
        uint256 tokenId,
        uint256 amount,
        uint256 price
    ) external onlyOwner returns (uint256 listingId) {
        require(price > 0, "Price must be > 0");

        if (assetType == AssetType.ERC20) {
            require(amount > 0, "Amount must be > 0");
            IERC20(token).transferFrom(msg.sender, address(this), amount);
        } else {
            IERC721(token).transferFrom(msg.sender, address(this), tokenId);
            amount = 1;
        }

        listingId = nextListingId++;
        listings[listingId] = Listing({
            token: token,
            assetType: assetType,
            tokenId: tokenId,
            amount: amount,
            price: price,
            active: true
        });

        emit Listed(listingId, token, assetType, price);
    }

    /// @notice Update the price of an active listing
    function update(uint256 listingId, uint256 newPrice) external onlyOwner {
        require(listings[listingId].active, "Not active");
        require(newPrice > 0, "Price must be > 0");
        listings[listingId].price = newPrice;
        emit Updated(listingId, newPrice);
    }

    /// @notice Remove a listing and return tokens to owner
    function delist(uint256 listingId) external onlyOwner {
        Listing storage l = listings[listingId];
        require(l.active, "Not active");
        l.active = false;

        if (l.assetType == AssetType.ERC20) {
            IERC20(l.token).transfer(owner(), l.amount);
        } else {
            IERC721(l.token).transferFrom(address(this), owner(), l.tokenId);
        }

        emit Delisted(listingId);
    }

    // ── Public ──────────────────────────────────────────────────────────

    /// @notice Buy a listed asset. Send USDR >= price.
    function buy(uint256 listingId) external payable {
        Listing storage l = listings[listingId];
        require(l.active, "Not active");
        require(msg.value >= l.price, "Insufficient payment");

        l.active = false;

        if (l.assetType == AssetType.ERC20) {
            IERC20(l.token).transfer(msg.sender, l.amount);
        } else {
            IERC721(l.token).safeTransferFrom(address(this), msg.sender, l.tokenId);
        }

        (bool sent,) = owner().call{value: msg.value}("");
        require(sent, "USDR transfer failed");

        emit Bought(listingId, msg.sender, msg.value);
    }

    /// @notice Get a listing by ID
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    /// @notice Get all active listing IDs
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

    /// @notice Allow contract to receive ERC721 via safeTransferFrom
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
