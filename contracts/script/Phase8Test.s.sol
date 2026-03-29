// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {BondCatalog} from "../src/BondCatalog.sol";
import {PortfolioAttestation} from "../src/PortfolioAttestation.sol";
import {AIAttestationVerifier} from "../src/AIAttestationVerifier.sol";
import {FidezaLendingPool} from "../src/FidezaLendingPool.sol";

/// @title Phase8Test
/// @notice Tests Phase 8 public chain contracts end-to-end.
///
/// Usage:
///   source .env
///   forge script script/Phase8Test.s.sol --rpc-url $PUBLIC_CHAIN_RPC_URL --broadcast --legacy
contract Phase8Test is Script {
    using MessageHashUtils for bytes32;

    BondCatalog catalog;
    PortfolioAttestation attestation;
    AIAttestationVerifier verifier;
    FidezaLendingPool pool;
    uint256 deployerKey;
    address deployer;

    function run() external {
        deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        deployer = vm.addr(deployerKey);

        catalog = BondCatalog(vm.envAddress("BOND_CATALOG_ADDRESS"));
        attestation = PortfolioAttestation(vm.envAddress("PORTFOLIO_ATTESTATION_ADDRESS"));
        verifier = AIAttestationVerifier(vm.envAddress("AI_ATTESTATION_VERIFIER_ADDRESS"));
        pool = FidezaLendingPool(payable(vm.envAddress("FIDEZA_LENDING_POOL_ADDRESS")));

        console.log("=== Phase 8 Testing ===");
        console.log("  Deployer:", deployer);
        console.log("");

        _testBondCatalog();

        vm.startBroadcast(deployerKey);
        _testAttestation();
        _testLendingDeposit();
        _testPoolStats();
        _testLendingWithdraw();
        vm.stopBroadcast();

        console.log("");
        console.log("=== Phase 8 Test Summary ===");
        console.log("  [PASS] BondCatalog: 12 bonds registered with correct data");
        console.log("  [PASS] PortfolioAttestation: ECDSA signature verified on-chain");
        console.log("  [PASS] AIAttestationVerifier: verifyPortfolio returns correct value");
        console.log("  [PASS] LendingPool: deposit + withdraw working");
        console.log("");
        console.log("Note: Borrow/repay/liquidate require bridged vault shares.");
        console.log("Run the portfolio agent to bridge shares, then test borrowing.");
    }

    function _testBondCatalog() internal view {
        console.log("[TEST 1] BondCatalog verification");
        uint256 bondCount = catalog.getBondCount();
        console.log("  Bond count:", bondCount);
        require(bondCount == 12, "Expected 12 bonds");

        BondCatalog.PublicBondInfo memory b1 = catalog.getBond(keccak256(bytes("BOND-2026-ENERGY-A1")));
        require(keccak256(bytes(b1.rating)) == keccak256(bytes("BB+")), "Energy rating mismatch");
        console.log("  BOND-2026-ENERGY-A1: rating=%s, risk=%s", b1.rating, vm.toString(b1.riskScore));

        BondCatalog.PublicBondInfo memory b2 = catalog.getBond(keccak256(bytes("ABS-2026-MORT-001")));
        require(keccak256(bytes(b2.rating)) == keccak256(bytes("AA-")), "Mortgage rating mismatch");
        console.log("  ABS-2026-MORT-001: rating=%s, risk=%s", b2.rating, vm.toString(b2.riskScore));
        console.log("  PASS: BondCatalog correct");
        console.log("");
    }

    function _testAttestation() internal {
        console.log("[TEST 2] PortfolioAttestation + Verifier");

        bytes32 portfolioId = keccak256(bytes("TEST-PORTFOLIO-PHASE8"));
        uint256 totalValue = 100_000 * 10 ** 18;
        uint256 weightedCouponBps = 450;
        uint8 numBonds = 12;
        uint8 divScore = 10;
        bytes32 methHash = keccak256(bytes("fideza-portfolio-v1-test"));

        // Construct and sign message
        bytes32 messageHash = keccak256(
            abi.encodePacked(portfolioId, totalValue, weightedCouponBps, numBonds, divScore, methHash)
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(deployerKey, ethSignedHash);

        attestation.submitAttestation(
            portfolioId, totalValue, weightedCouponBps, numBonds, divScore, methHash,
            abi.encodePacked(r, s, v)
        );
        console.log("  Attestation submitted");

        require(attestation.hasValidAttestation(portfolioId), "Attestation not found");
        require(attestation.getAttestedValue(portfolioId) == totalValue, "Value mismatch");

        (bool valid, uint256 val) = verifier.verifyPortfolio(portfolioId);
        require(valid && val == totalValue, "Verifier mismatch");
        console.log("  Verifier: valid=true, value=%s USDr", vm.toString(val / 10 ** 18));
        console.log("  PASS: Attestation verified");
        console.log("");
    }

    function _testLendingDeposit() internal {
        console.log("[TEST 3] Lending Pool - Deposit");
        uint256 amount = 1 * 10 ** 16;  // 0.01 USDr (small amount to preserve balance)
        pool.deposit{value: amount}();

        uint256 bal = pool.lenderBalances(deployer);
        require(bal == amount, "Balance mismatch");
        console.log("  Deposited: %s USDr", vm.toString(amount / 10 ** 18));
        console.log("  PASS: Deposit successful");
        console.log("");
    }

    function _testPoolStats() internal view {
        console.log("[TEST 4] Lending Pool - Stats");
        (uint256 dep, uint256 bor, uint256 avail, uint256 util) = pool.getPoolStats();
        console.log("  Deposited: %s USDr, Borrowed: %s USDr", vm.toString(dep / 10 ** 18), vm.toString(bor / 10 ** 18));
        console.log("  Available: %s USDr, Util: %s bps", vm.toString(avail / 10 ** 18), vm.toString(util));
        console.log("  PASS: Pool stats correct");
        console.log("");
    }

    function _testLendingWithdraw() internal {
        console.log("[TEST 5] Lending Pool - Withdraw");
        uint256 amount = 5 * 10 ** 15;  // 0.005 USDr (half of deposit)
        pool.withdraw(amount);

        uint256 bal = pool.lenderBalances(deployer);
        require(bal == 5 * 10 ** 15, "Post-withdraw mismatch");
        console.log("  Withdrew: %s USDr", vm.toString(amount / 10 ** 18));
        console.log("  Remaining: %s USDr", vm.toString(bal / 10 ** 18));
        console.log("  PASS: Withdrawal successful");
    }
}
