// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {FidezaPTYT} from "./FidezaPTYT.sol";

/// @title PTYTSplitter
/// @notice Splits receipt tokens (bridged mirror ERC-20s) into Principal Tokens (PT)
///         and Yield Tokens (YT). Handles merge-back and settlement at maturity.
///
///         Economics:
///         - 1 receipt locked = 1 PT + 1 YT minted (always 1:1)
///         - Anyone with 1 PT + 1 YT can merge back anytime (pre-settlement)
///         - At maturity, issuer deposits USDr for principal + yield settlement
///         - PT holders redeem pro-rata principal, YT holders redeem pro-rata yield
contract PTYTSplitter is Ownable {

    struct SplitConfig {
        bytes32 assetId;
        address receiptTokenAddress;
        address ptTokenAddress;
        address ytTokenAddress;
        uint256 maturityTimestamp;
        uint256 principalPerToken;
        uint256 expectedYieldPerToken;
        uint256 totalPrincipalSettled;
        uint256 totalYieldDistributed;
        uint256 totalReceiptLocked;
        bool principalSettled;
        bool yieldSettled;
    }

    struct InitParams {
        bytes32 assetId;
        address receiptToken;
        uint256 maturityTimestamp;
        uint256 principalPerToken;
        uint256 expectedYieldPerToken;
        string ptName;
        string ptSymbol;
        string ytName;
        string ytSymbol;
    }

    mapping(bytes32 => SplitConfig) public splits;
    bytes32[] public splitAssetIds;

    event SplitInitialized(bytes32 indexed assetId, address pt, address yt);
    event TokensSplit(bytes32 indexed assetId, address indexed user, uint256 amount);
    event TokensMerged(bytes32 indexed assetId, address indexed user, uint256 amount);
    event PrincipalSettled(bytes32 indexed assetId, uint256 amount);
    event YieldDistributed(bytes32 indexed assetId, uint256 amount);
    event PTRedeemed(bytes32 indexed assetId, address indexed user, uint256 amount, uint256 payout);
    event YTRedeemed(bytes32 indexed assetId, address indexed user, uint256 amount, uint256 payout);

    constructor() Ownable(msg.sender) {}

    receive() external payable {}

    // -- Admin ---------------------------------------------------------------

    /// @notice Deploy PT + YT tokens for an asset. Only owner.
    function initializeSplit(InitParams calldata p)
        external onlyOwner returns (address pt, address yt)
    {
        require(splits[p.assetId].receiptTokenAddress == address(0), "Already initialized");
        require(p.receiptToken != address(0), "Invalid receipt token");

        FidezaPTYT ptToken = new FidezaPTYT(p.ptName, p.ptSymbol);
        FidezaPTYT ytToken = new FidezaPTYT(p.ytName, p.ytSymbol);

        splits[p.assetId] = SplitConfig({
            assetId: p.assetId,
            receiptTokenAddress: p.receiptToken,
            ptTokenAddress: address(ptToken),
            ytTokenAddress: address(ytToken),
            maturityTimestamp: p.maturityTimestamp,
            principalPerToken: p.principalPerToken,
            expectedYieldPerToken: p.expectedYieldPerToken,
            totalPrincipalSettled: 0,
            totalYieldDistributed: 0,
            totalReceiptLocked: 0,
            principalSettled: false,
            yieldSettled: false
        });

        splitAssetIds.push(p.assetId);

        emit SplitInitialized(p.assetId, address(ptToken), address(ytToken));
        return (address(ptToken), address(ytToken));
    }

    /// @notice Issuer deposits USDr for principal settlement at maturity.
    function settlePrincipal(bytes32 assetId) external payable onlyOwner {
        SplitConfig storage s = splits[assetId];
        require(s.receiptTokenAddress != address(0), "Not initialized");
        require(!s.principalSettled, "Already settled");
        require(msg.value > 0, "No USDr sent");

        s.totalPrincipalSettled = msg.value;
        s.principalSettled = true;

        emit PrincipalSettled(assetId, msg.value);
    }

    /// @notice Issuer deposits USDr for yield distribution.
    function distributeYield(bytes32 assetId) external payable onlyOwner {
        SplitConfig storage s = splits[assetId];
        require(s.receiptTokenAddress != address(0), "Not initialized");
        require(!s.yieldSettled, "Already distributed");
        require(msg.value > 0, "No USDr sent");

        s.totalYieldDistributed = msg.value;
        s.yieldSettled = true;

        emit YieldDistributed(assetId, msg.value);
    }

    // -- Public --------------------------------------------------------------

    /// @notice Lock receipt tokens, receive PT + YT (1:1).
    ///         Caller must approve this contract to spend receipt tokens first.
    function split(bytes32 assetId, uint256 amount) external {
        SplitConfig storage s = splits[assetId];
        require(s.receiptTokenAddress != address(0), "Not initialized");
        require(amount > 0, "Amount must be > 0");

        IERC20(s.receiptTokenAddress).transferFrom(msg.sender, address(this), amount);

        FidezaPTYT(s.ptTokenAddress).mint(msg.sender, amount);
        FidezaPTYT(s.ytTokenAddress).mint(msg.sender, amount);

        s.totalReceiptLocked += amount;

        emit TokensSplit(assetId, msg.sender, amount);
    }

    /// @notice Burn PT + YT, receive receipt tokens back. Only before settlement.
    function merge(bytes32 assetId, uint256 amount) external {
        SplitConfig storage s = splits[assetId];
        require(s.receiptTokenAddress != address(0), "Not initialized");
        require(!s.principalSettled, "Cannot merge after settlement");
        require(amount > 0, "Amount must be > 0");

        FidezaPTYT(s.ptTokenAddress).burn(msg.sender, amount);
        FidezaPTYT(s.ytTokenAddress).burn(msg.sender, amount);

        IERC20(s.receiptTokenAddress).transfer(msg.sender, amount);

        s.totalReceiptLocked -= amount;

        emit TokensMerged(assetId, msg.sender, amount);
    }

    /// @notice PT holder redeems for pro-rata principal USDr.
    function redeemPT(bytes32 assetId, uint256 amount) external {
        SplitConfig storage s = splits[assetId];
        require(s.principalSettled, "Principal not settled");
        require(amount > 0, "Amount must be > 0");
        require(s.totalReceiptLocked > 0, "No receipts locked");

        uint256 payout = (amount * s.totalPrincipalSettled) / s.totalReceiptLocked;

        FidezaPTYT(s.ptTokenAddress).burn(msg.sender, amount);

        (bool sent,) = payable(msg.sender).call{value: payout}("");
        require(sent, "USDr transfer failed");

        emit PTRedeemed(assetId, msg.sender, amount, payout);
    }

    /// @notice YT holder redeems for pro-rata yield USDr.
    function redeemYT(bytes32 assetId, uint256 amount) external {
        SplitConfig storage s = splits[assetId];
        require(s.yieldSettled, "Yield not distributed");
        require(amount > 0, "Amount must be > 0");
        require(s.totalReceiptLocked > 0, "No receipts locked");

        uint256 payout = (amount * s.totalYieldDistributed) / s.totalReceiptLocked;

        FidezaPTYT(s.ytTokenAddress).burn(msg.sender, amount);

        (bool sent,) = payable(msg.sender).call{value: payout}("");
        require(sent, "USDr transfer failed");

        emit YTRedeemed(assetId, msg.sender, amount, payout);
    }

    // -- Views ---------------------------------------------------------------

    function getSplit(bytes32 assetId) external view returns (SplitConfig memory) {
        return splits[assetId];
    }

    function getAllSplitIds() external view returns (bytes32[] memory) {
        return splitAssetIds;
    }
}
