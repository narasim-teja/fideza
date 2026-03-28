// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPortfolioVerifier} from "./IPortfolioVerifier.sol";

/// @title FidezaLendingPool
/// @notice Lending pool where lenders deposit USDr (native token) and borrowers
///         use AI-attested vault share tokens as collateral.
///         Fixed 10% APY, 150% collateral ratio, 120% liquidation threshold, 5% penalty.
contract FidezaLendingPool is Ownable {
    // -- Constants ---------------------------------------------------------------

    uint256 public constant INTEREST_RATE_BPS = 1000;          // 10% annual
    uint256 public constant COLLATERAL_RATIO_BPS = 15000;      // 150%
    uint256 public constant LIQUIDATION_THRESHOLD_BPS = 12000;  // 120%
    uint256 public constant LIQUIDATION_PENALTY_BPS = 500;     // 5%
    uint256 public constant BPS_BASE = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    // -- State -------------------------------------------------------------------

    struct Loan {
        address borrower;
        address collateralToken;    // Vault share token ERC-20 address
        bytes32 portfolioId;        // Links to PortfolioAttestation
        uint256 collateralAmount;   // Amount of share tokens deposited
        uint256 principal;          // USDr borrowed (in wei)
        uint256 startTime;          // Timestamp when borrowed
        bool active;
    }

    IPortfolioVerifier public verifier;
    uint256 public totalDeposited;
    uint256 public totalBorrowed;
    mapping(address => uint256) public lenderBalances;
    mapping(uint256 => Loan) public loans;
    uint256 public nextLoanId;

    // -- Events ------------------------------------------------------------------

    event Deposited(address indexed lender, uint256 amount);
    event Withdrawn(address indexed lender, uint256 amount);
    event Borrowed(uint256 indexed loanId, address indexed borrower, uint256 principal, bytes32 portfolioId);
    event Repaid(uint256 indexed loanId, address indexed borrower, uint256 totalPaid);
    event Liquidated(uint256 indexed loanId, address indexed liquidator, uint256 debtRepaid);

    // -- Constructor -------------------------------------------------------------

    constructor(address _verifier) Ownable(msg.sender) {
        require(_verifier != address(0), "Invalid verifier");
        verifier = IPortfolioVerifier(_verifier);
    }

    // -- Receive -----------------------------------------------------------------

    receive() external payable {}

    // -- Lender Functions --------------------------------------------------------

    /// @notice Deposit USDr (native token) into the lending pool.
    function deposit() external payable {
        require(msg.value > 0, "Must deposit > 0");
        lenderBalances[msg.sender] += msg.value;
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Withdraw USDr from the lending pool.
    function withdraw(uint256 amount) external {
        require(amount > 0, "Must withdraw > 0");
        require(lenderBalances[msg.sender] >= amount, "Insufficient balance");
        require(address(this).balance >= amount, "Insufficient pool liquidity");

        lenderBalances[msg.sender] -= amount;
        totalDeposited -= amount;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "USDr transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    // -- Borrower Functions ------------------------------------------------------

    /// @notice Borrow USDr against vault share token collateral.
    /// @param collateralToken The vault share ERC-20 token address.
    /// @param portfolioId The portfolio ID linked to the attestation.
    /// @param collateralAmount Amount of share tokens to deposit as collateral.
    /// @param borrowAmount Amount of USDr to borrow.
    function borrow(
        address collateralToken,
        bytes32 portfolioId,
        uint256 collateralAmount,
        uint256 borrowAmount
    ) external {
        require(borrowAmount > 0, "Must borrow > 0");
        require(collateralAmount > 0, "Must provide collateral");
        require(address(this).balance >= borrowAmount, "Insufficient pool liquidity");

        // Verify portfolio attestation
        (bool valid, uint256 attestedValue) = verifier.verifyPortfolio(portfolioId);
        require(valid, "No valid portfolio attestation");

        // Check collateral ratio: attestedValue must be >= borrowAmount * 150%
        uint256 requiredCollateral = (borrowAmount * COLLATERAL_RATIO_BPS) / BPS_BASE;
        require(attestedValue >= requiredCollateral, "Insufficient collateral ratio");

        // Escrow vault share tokens
        bool transferred = IERC20(collateralToken).transferFrom(msg.sender, address(this), collateralAmount);
        require(transferred, "Collateral transfer failed");

        // Create loan
        uint256 loanId = nextLoanId++;
        loans[loanId] = Loan({
            borrower: msg.sender,
            collateralToken: collateralToken,
            portfolioId: portfolioId,
            collateralAmount: collateralAmount,
            principal: borrowAmount,
            startTime: block.timestamp,
            active: true
        });

        totalBorrowed += borrowAmount;

        // Send USDr to borrower
        (bool sent, ) = payable(msg.sender).call{value: borrowAmount}("");
        require(sent, "USDr transfer failed");

        emit Borrowed(loanId, msg.sender, borrowAmount, portfolioId);
    }

    /// @notice Repay a loan (principal + interest). Returns collateral.
    function repay(uint256 loanId) external payable {
        Loan storage loan = loans[loanId];
        require(loan.active, "Loan not active");
        require(loan.borrower == msg.sender, "Not borrower");

        uint256 debt = _computeDebt(loan);
        require(msg.value >= debt, "Insufficient repayment");

        // Mark loan as repaid
        loan.active = false;
        totalBorrowed -= loan.principal;

        // Return collateral to borrower
        bool transferred = IERC20(loan.collateralToken).transfer(msg.sender, loan.collateralAmount);
        require(transferred, "Collateral return failed");

        // Refund excess payment
        uint256 excess = msg.value - debt;
        if (excess > 0) {
            (bool sent, ) = payable(msg.sender).call{value: excess}("");
            require(sent, "Refund failed");
        }

        emit Repaid(loanId, msg.sender, debt);
    }

    // -- Liquidation -------------------------------------------------------------

    /// @notice Liquidate an undercollateralized loan.
    ///         Anyone can call. Liquidator sends debt amount, receives collateral.
    ///         Pool keeps 95% of debt, liquidator gets 5% penalty refund.
    function liquidate(uint256 loanId) external payable {
        Loan storage loan = loans[loanId];
        require(loan.active, "Loan not active");

        // Check that loan is undercollateralized
        uint256 ratio = _getCollateralRatio(loan);
        require(ratio < LIQUIDATION_THRESHOLD_BPS, "Loan is healthy");

        uint256 debt = _computeDebt(loan);
        require(msg.value >= debt, "Must cover full debt");

        // Mark loan as liquidated
        loan.active = false;
        totalBorrowed -= loan.principal;

        // Transfer collateral to liquidator
        bool transferred = IERC20(loan.collateralToken).transfer(msg.sender, loan.collateralAmount);
        require(transferred, "Collateral transfer failed");

        // Liquidator reward: 5% of debt refunded
        uint256 penalty = (debt * LIQUIDATION_PENALTY_BPS) / BPS_BASE;
        uint256 refund = (msg.value - debt) + penalty;
        if (refund > 0) {
            (bool sent, ) = payable(msg.sender).call{value: refund}("");
            require(sent, "Liquidation refund failed");
        }

        emit Liquidated(loanId, msg.sender, debt - penalty);
    }

    // -- View Functions ----------------------------------------------------------

    /// @notice Get the current total debt (principal + accrued interest) for a loan.
    function getDebt(uint256 loanId) external view returns (uint256) {
        Loan storage loan = loans[loanId];
        if (!loan.active) return 0;
        return _computeDebt(loan);
    }

    /// @notice Get the current collateral ratio for a loan (in bps).
    function getCollateralRatio(uint256 loanId) external view returns (uint256) {
        Loan storage loan = loans[loanId];
        if (!loan.active) return 0;
        return _getCollateralRatio(loan);
    }

    /// @notice Get available liquidity in the pool.
    function getAvailableLiquidity() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Get pool statistics.
    function getPoolStats() external view returns (
        uint256 _totalDeposited,
        uint256 _totalBorrowed,
        uint256 _availableLiquidity,
        uint256 _utilizationBps
    ) {
        _totalDeposited = totalDeposited;
        _totalBorrowed = totalBorrowed;
        _availableLiquidity = address(this).balance;
        _utilizationBps = totalDeposited > 0
            ? (totalBorrowed * BPS_BASE) / totalDeposited
            : 0;
    }

    // -- Internal ----------------------------------------------------------------

    function _computeDebt(Loan storage loan) internal view returns (uint256) {
        uint256 elapsed = block.timestamp - loan.startTime;
        uint256 interest = (loan.principal * INTEREST_RATE_BPS * elapsed) / (BPS_BASE * SECONDS_PER_YEAR);
        return loan.principal + interest;
    }

    function _getCollateralRatio(Loan storage loan) internal view returns (uint256) {
        (, uint256 attestedValue) = verifier.verifyPortfolio(loan.portfolioId);
        uint256 debt = _computeDebt(loan);
        if (debt == 0) return type(uint256).max;
        return (attestedValue * BPS_BASE) / debt;
    }
}
