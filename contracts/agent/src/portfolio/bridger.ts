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
  mirrorShareTokenAddress?: string;
}

/**
 * Submit portfolio attestation to public chain and bridge vault shares.
 *
 * @param shareTokenAddress - VaultShareToken address on Privacy Node
 * @param attestation - Signed portfolio attestation from attestor.ts
 * @param privacyWallet - Wallet connected to Privacy Node (holds share tokens)
 * @param recipientAddress - Optional user wallet address to receive shares on public chain
 */
export async function bridgePortfolioShares(
  shareTokenAddress: string,
  attestation: PortfolioAttestation,
  privacyWallet: ethers.Wallet,
  recipientAddress?: string,
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

  // Run attestation (public chain) and bridge prep (privacy node) in parallel
  const shareToken = new ethers.Contract(
    shareTokenAddress,
    abis.vaultShareToken,
    privacyWallet,
  );

  const publicChainId = 7295799;
  const registeredKey = process.env.REGISTERED_PRIVATE_KEY;

  const [attestReceipt, bridgePrep] = await Promise.all([
    // Branch 1: Submit attestation on public chain
    (async () => {
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
      const receipt = await attestTx.wait();
      console.log(`  Attestation submitted: TX ${receipt.hash}`);
      console.log(`  Explorer: https://testnet-explorer.rayls.com/tx/${receipt.hash}`);
      return receipt;
    })(),

    // Branch 2: Prepare bridge on privacy node (transfer to registered if needed)
    (async () => {
      console.log("  Preparing bridge (parallel with attestation)...");
      const balance = await shareToken.balanceOf(privacyWallet.address);
      if (balance === 0n) {
        console.log("  No share tokens to bridge (balance = 0)");
        return { balance: 0n, bridgeWallet: privacyWallet, bridgeShareToken: shareToken };
      }
      console.log(`  Share token balance: ${ethers.formatEther(balance)}`);

      let bridgeWallet = privacyWallet;
      let bridgeShareToken = shareToken;

      if (registeredKey && registeredKey !== config.deployerPrivateKey) {
        const registeredWallet = new ethers.Wallet(registeredKey, privacyWallet.provider!);
        console.log(`  Registered bridge address: ${registeredWallet.address}`);
        console.log(`  Transferring shares to registered address for bridge...`);
        const transferTx = await shareToken.transfer(registeredWallet.address, balance, { type: 0 });
        await transferTx.wait();
        console.log(`  Transferred ${ethers.formatEther(balance)} share tokens`);
        bridgeWallet = registeredWallet;
        bridgeShareToken = new ethers.Contract(shareTokenAddress, abis.vaultShareToken, registeredWallet);
      }

      return { balance, bridgeWallet, bridgeShareToken };
    })(),
  ]);

  // -----------------------------------------------------------------------
  // 2. Bridge vault shares to public chain via teleportToPublicChain
  // -----------------------------------------------------------------------
  if (bridgePrep.balance === 0n) {
    return { attestationTxHash: attestReceipt.hash, bridgeTxHash: "no-balance" };
  }

  // Bridge directly to user's wallet when provided (like fund-privy.sh).
  // The relayer mints mirror tokens to this address on the public chain.
  const recipient = recipientAddress || bridgePrep.bridgeWallet.address;
  console.log(`  Bridging vault shares to public chain...`);
  console.log(`  Destination: public chain (ID: ${publicChainId})`);
  console.log(`  Recipient: ${recipient}`);

  try {
    // Retry teleport up to 3 times — token registration may need a few seconds to propagate
    let bridgeReceipt: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`  Retry ${attempt}/3 — waiting for token registration...`);
          await new Promise((r) => setTimeout(r, 5000));
        }
        const bridgeTx = await bridgePrep.bridgeShareToken.teleportToPublicChain(
          recipient,
          bridgePrep.balance,
          publicChainId,
          { type: 0 },
        );
        bridgeReceipt = await bridgeTx.wait();
        break;
      } catch (e: any) {
        if (attempt === 3) throw e;
        console.log(`  Teleport attempt ${attempt} failed, retrying...`);
      }
    }
    console.log(`  Bridge initiated: TX ${bridgeReceipt.hash}`);
    console.log(`  Privacy Node explorer: https://blockscout-privacy-node-1.rayls.com/tx/${bridgeReceipt.hash}`);
    console.log("  Note: Mirror tokens will appear on public chain in ~30-60 seconds (relay)");

    // -----------------------------------------------------------------------
    // 3. Discover mirror token address on public chain
    //    Tokens are bridged directly to the user — no intermediate transfer
    //    needed. We just need to find the mirror contract address so the
    //    client can use it for balanceOf / approve / borrow.
    // -----------------------------------------------------------------------
    let mirrorShareTokenAddress: string | undefined;
    if (recipientAddress) {
      console.log(`  Waiting for mirror token on public chain (polling ~80s)...`);
      const transferEventTopic = ethers.id("Transfer(address,address,uint256)");
      const recipientPadded = ethers.zeroPadValue(recipientAddress, 32);
      const blockBeforeBridge = await publicProvider.getBlockNumber();

      // Poll for Transfer mint events (from 0x0 → recipient) on public chain
      const pollIntervals = [15000, 5000, 5000, 5000, 5000, 8000, 10000, 12000, 15000];
      for (const interval of pollIntervals) {
        await new Promise((r) => setTimeout(r, interval));
        try {
          const logs = await publicProvider.getLogs({
            fromBlock: Math.max(0, blockBeforeBridge - 5),
            toBlock: "latest",
            topics: [
              transferEventTopic,
              ethers.zeroPadValue(ethers.ZeroAddress, 32), // from = 0x0 (mint)
              recipientPadded,                              // to = user
            ],
          });

          if (logs.length > 0) {
            // The contract that emitted the mint Transfer IS the mirror token
            mirrorShareTokenAddress = logs[logs.length - 1].address;
            console.log(`  Mirror token discovered: ${mirrorShareTokenAddress}`);
            break;
          }
        } catch {
          // Public chain may not have indexed the block yet
        }
      }

      if (!mirrorShareTokenAddress) {
        console.log("  Mirror token address not yet discoverable — relay may still be in progress");
        console.log("  User received shares directly; mirror address can be resolved later");
      }
    }

    return {
      attestationTxHash: attestReceipt.hash,
      bridgeTxHash: bridgeReceipt.hash,
      mirrorShareTokenAddress,
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
