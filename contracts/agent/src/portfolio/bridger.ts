/**
 * Phase 8 — Bridge portfolio shares to public chain + submit attestation.
 *
 * Two operations:
 * 1. Submit attestation to PortfolioAttestation contract on public chain
 * 2. Bridge vault shares via teleportToPublicChain on Privacy Node
 *
 * Note: teleportToPublicChain requires onlyRegisteredUsers — if the deployer
 * isn't registered, we transfer shares to the registered address first.
 */
import { ethers } from "ethers";
import { config, abis } from "../config";
import type { PortfolioAttestation } from "../types";

export interface BridgeResult {
  attestationTxHash: string;
  bridgeTxHash: string;
}

/**
 * Submit portfolio attestation to public chain and bridge vault shares.
 *
 * @param shareTokenAddress - VaultShareToken address on Privacy Node
 * @param attestation - Signed portfolio attestation from attestor.ts
 * @param privacyWallet - Wallet connected to Privacy Node (holds share tokens)
 */
export async function bridgePortfolioShares(
  shareTokenAddress: string,
  attestation: PortfolioAttestation,
  privacyWallet: ethers.Wallet,
): Promise<BridgeResult> {
  // -----------------------------------------------------------------------
  // 1. Submit attestation to PortfolioAttestation on public chain
  // -----------------------------------------------------------------------
  console.log("  Submitting attestation to public chain...");

  if (!config.deployerPrivateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY required for public chain transactions");
  }
  if (config.portfolioAttestationAddress === "0x") {
    console.log("  PORTFOLIO_ATTESTATION_ADDRESS not set — skipping attestation submission");
    console.log("  Deploy Phase 8 contracts first, then update .env");
    return { attestationTxHash: "not-deployed", bridgeTxHash: "not-deployed" };
  }

  const publicProvider = new ethers.JsonRpcProvider(config.publicChainRpc);
  const publicWallet = new ethers.Wallet(config.deployerPrivateKey, publicProvider);

  const portfolioAttestation = new ethers.Contract(
    config.portfolioAttestationAddress,
    abis.portfolioAttestation,
    publicWallet,
  );

  const attestTx = await portfolioAttestation.submitAttestation(
    attestation.portfolioId,
    attestation.totalValue,
    attestation.weightedCouponBps,
    attestation.numBonds,
    attestation.diversificationScore,
    attestation.methodologyHash,
    attestation.signature,
    { type: 0 },
  );
  const attestReceipt = await attestTx.wait();
  console.log(`  Attestation submitted: TX ${attestReceipt.hash}`);
  console.log(`  Explorer: https://testnet-explorer.rayls.com/tx/${attestReceipt.hash}`);

  // -----------------------------------------------------------------------
  // 2. Bridge vault shares to public chain via teleportToPublicChain
  // -----------------------------------------------------------------------
  console.log("  Bridging vault shares to public chain...");

  const shareToken = new ethers.Contract(
    shareTokenAddress,
    abis.vaultShareToken,
    privacyWallet,
  );

  // Get total balance to bridge
  const balance = await shareToken.balanceOf(privacyWallet.address);
  if (balance === 0n) {
    console.log("  No share tokens to bridge (balance = 0)");
    return { attestationTxHash: attestReceipt.hash, bridgeTxHash: "no-balance" };
  }

  console.log(`  Share token balance: ${ethers.formatEther(balance)}`);

  // Determine bridge wallet — teleportToPublicChain requires onlyRegisteredUsers.
  // If REGISTERED_PRIVATE_KEY is configured and different from deployer, transfer
  // shares to the registered address first, then bridge from there.
  const registeredKey = process.env.REGISTERED_PRIVATE_KEY;
  let bridgeWallet = privacyWallet;
  let bridgeShareToken = shareToken;
  const publicChainId = 7295799;

  if (registeredKey && registeredKey !== config.deployerPrivateKey) {
    const registeredWallet = new ethers.Wallet(registeredKey, privacyWallet.provider!);
    console.log(`  Registered bridge address: ${registeredWallet.address}`);
    console.log(`  Transferring shares to registered address for bridge...`);

    // Transfer from deployer to registered address
    const transferTx = await shareToken.transfer(registeredWallet.address, balance, { type: 0 });
    await transferTx.wait();
    console.log(`  Transferred ${ethers.formatEther(balance)} share tokens`);

    bridgeWallet = registeredWallet;
    bridgeShareToken = new ethers.Contract(shareTokenAddress, abis.vaultShareToken, registeredWallet);
  }

  const recipient = bridgeWallet.address;
  console.log(`  Destination: public chain (ID: ${publicChainId})`);
  console.log(`  Recipient: ${recipient}`);

  try {
    const bridgeTx = await bridgeShareToken.teleportToPublicChain(
      recipient,
      balance,
      publicChainId,
      { type: 0 },
    );
    const bridgeReceipt = await bridgeTx.wait();
    console.log(`  Bridge initiated: TX ${bridgeReceipt.hash}`);
    console.log(`  Privacy Node explorer: https://blockscout-privacy-node-1.rayls.com/tx/${bridgeReceipt.hash}`);
    console.log("  Note: Mirror tokens will appear on public chain in ~30-60 seconds (relay)");

    return {
      attestationTxHash: attestReceipt.hash,
      bridgeTxHash: bridgeReceipt.hash,
    };
  } catch (e: any) {
    console.log(`  Bridge teleport failed: ${e.message?.slice(0, 120)}`);
    console.log("  This typically means the sender is not registered in RNUserGovernance.");
    console.log("  The attestation was submitted successfully. Bridge shares manually via:");
    console.log(`    forge script script/Phase3Bridge.s.sol --rpc-url $PRIVACY_NODE_RPC_URL --broadcast --legacy`);

    return {
      attestationTxHash: attestReceipt.hash,
      bridgeTxHash: "bridge-failed-user-not-registered",
    };
  }
}
