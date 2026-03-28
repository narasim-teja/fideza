#!/bin/bash
set -euo pipefail

# Phase 3: Governance + Bridge
# Usage: cd contracts && bash script/phase3-execute.sh

source .env

echo "============================================="
echo "  PHASE 3: Governance + Bridge"
echo "============================================="
echo ""

# --- Step 1: Governance (redeploy + attest + approve + transfer) ---
echo "=== Step 1: Running Phase3Governance ==="
echo "  - Redeploying ComplianceStore v3 + DisclosureGate v3"
echo "  - Submitting APPROVE attestations for all 3 assets"
echo "  - Approving disclosures via DisclosureGate"
echo "  - Transferring tokens to registered address"
echo ""

forge script script/Phase3Governance.s.sol \
  --rpc-url "$PRIVACY_NODE_RPC_URL" \
  --broadcast \
  --legacy

echo ""
echo "=========================================="
echo "  UPDATE .env with new ComplianceStore and"
echo "  DisclosureGate addresses from above output,"
echo "  then press Enter to continue..."
echo "=========================================="
read -r

# Reload env with new addresses
source .env

# --- Step 2: Bridge tokens to Public Chain ---
echo ""
echo "=== Step 2: Bridging tokens to Public Chain ==="
forge script script/Phase3Bridge.s.sol \
  --rpc-url "$PRIVACY_NODE_RPC_URL" \
  --broadcast \
  --legacy

# --- Step 3: Wait for relayer ---
echo ""
echo "=== Step 3: Waiting for relayer to deploy mirror contracts... ==="
echo "  (typically 30-60 seconds per token)"
echo "  Waiting 90 seconds..."
sleep 90

# --- Step 4: Verification ---
echo ""
echo "============================================="
echo "  PHASE 3 COMPLETE"
echo "============================================="
echo ""
echo "Verify receipt tokens on the Public Chain:"
echo "  Explorer: https://testnet-explorer.rayls.com"
echo "  Search for TRANSFER_TO address: $TRANSFER_TO"
echo ""
echo "Verify lock transactions on the Privacy Node:"
echo "  Explorer: https://blockscout-privacy-node-1.rayls.com"
echo ""
echo "All 3 assets are ERC-20, registered as standard 1."
echo ""
echo "Next: Phase 4 — Public Chain Contracts (ReceiptTokenFactory, PTYTSplitter, FidezaMarketplace)"
