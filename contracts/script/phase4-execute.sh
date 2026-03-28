#!/bin/bash
set -euo pipefail

# Phase 4: Public Chain Contracts (ReceiptTokenFactory, PTYTSplitter, FidezaMarketplace)
# Usage: cd contracts && bash script/phase4-execute.sh

source .env

echo "============================================="
echo "  PHASE 4: Public Chain Contracts"
echo "============================================="
echo ""
echo "  RPC: $PUBLIC_CHAIN_RPC_URL"
echo "  Chain ID: $PUBLIC_CHAIN_ID"
echo ""

# --- Step 1: Deploy all Phase 4 contracts ---
echo "=== Step 1: Deploying contracts ==="
echo "  - ReceiptTokenFactory (disclosure metadata registry)"
echo "  - PTYTSplitter (split/merge/settle/redeem)"
echo "  - FidezaMarketplace (receipt/PT/YT marketplace)"
echo "  - Registering 3 receipts"
echo "  - Initializing 3 PT/YT splits (deploys 6 PT/YT ERC-20 tokens)"
echo "  - Total: 9 contract deployments"
echo ""

forge script script/DeployPhase4.s.sol \
  --rpc-url "$PUBLIC_CHAIN_RPC_URL" \
  --broadcast \
  --legacy

echo ""
echo "=========================================="
echo "  UPDATE .env with the deployed addresses"
echo "  from the output above, then press Enter"
echo "  to continue to verification..."
echo "=========================================="
read -r

# Reload env with new addresses
source .env

# --- Step 2: Verification ---
echo ""
echo "=== Step 2: Verifying deployments ==="

echo "  Checking ReceiptTokenFactory..."
cast call "$RECEIPT_TOKEN_FACTORY_ADDRESS" "getAllReceiptIds()(bytes32[])" --rpc-url "$PUBLIC_CHAIN_RPC_URL"

echo "  Checking PTYTSplitter..."
cast call "$PTYT_SPLITTER_ADDRESS" "getAllSplitIds()(bytes32[])" --rpc-url "$PUBLIC_CHAIN_RPC_URL"

echo "  Checking FidezaMarketplace..."
echo "    nextListingId: $(cast call "$FIDEZA_MARKETPLACE_ADDRESS" "nextListingId()(uint256)" --rpc-url "$PUBLIC_CHAIN_RPC_URL")"

echo ""
echo "============================================="
echo "  PHASE 4 COMPLETE"
echo "============================================="
echo ""
echo "Deployed contracts on Public Chain:"
echo "  ReceiptTokenFactory: $RECEIPT_TOKEN_FACTORY_ADDRESS"
echo "  PTYTSplitter:        $PTYT_SPLITTER_ADDRESS"
echo "  FidezaMarketplace:   $FIDEZA_MARKETPLACE_ADDRESS"
echo ""
echo "Verify on Public Chain explorer:"
echo "  https://testnet-explorer.rayls.com"
echo ""
echo "Next steps:"
echo "  1. Approve mirror tokens to PTYTSplitter, then call split(assetId, amount)"
echo "  2. List PT/YT tokens on FidezaMarketplace via listWithMetadata()"
echo "  3. At maturity, call settlePrincipal() + distributeYield()"
echo ""
echo "Next phase: Phase 5 — Frontend (Marketplace browse, asset detail, PT/YT UI)"
