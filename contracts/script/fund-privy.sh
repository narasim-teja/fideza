#!/bin/bash
set -euo pipefail

# Fund Privy wallet with mirror tokens for testing Phase 5 UI
# Flow: Deployer -> Registered address (privacy node) -> Bridge to Privy wallet (public chain)
# Usage: cd contracts && bash script/fund-privy.sh

source .env

PRIVY_WALLET="0x300de2001FE0dA13B2aF275C9cAAFF847A2b7CEe"
PRIVACY_RPC="$PRIVACY_NODE_RPC_URL"

echo "=== Fund Privy Wallet for Phase 5 Testing ==="
echo ""

# Step 1: Deployer transfers tokens to registered address on Privacy Node (gasless)
echo "Step 1: Deployer -> Registered address on Privacy Node..."

REGISTERED_ADDR=$(cast wallet address "$REGISTERED_PRIVATE_KEY")
echo "  Registered address: $REGISTERED_ADDR"

echo "  Transferring 10,000 InvoiceTokens..."
cast send "$INVOICE_TOKEN_ADDRESS" "transfer(address,uint256)" "$REGISTERED_ADDR" 10000000000000000000000 \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --rpc-url "$PRIVACY_RPC" \
  --legacy 2>&1 | grep -E "status|Error" || true

echo "  Transferring 50 BondTokens..."
cast send "$BOND_TOKEN_ADDRESS" "transfer(address,uint256)" "$REGISTERED_ADDR" 50000000000000000000 \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --rpc-url "$PRIVACY_RPC" \
  --legacy 2>&1 | grep -E "status|Error" || true

echo "  Transferring 100 ABSTokens..."
cast send "$ABS_TOKEN_ADDRESS" "transfer(address,uint256)" "$REGISTERED_ADDR" 100000000000000000000 \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --rpc-url "$PRIVACY_RPC" \
  --legacy 2>&1 | grep -E "status|Error" || true

echo ""

# Step 2: Registered user bridges directly to Privy wallet on public chain
echo "Step 2: Bridging tokens directly to Privy wallet ($PRIVY_WALLET)..."

echo "  Bridging 10,000 InvoiceTokens..."
cast send "$INVOICE_TOKEN_ADDRESS" "teleportToPublicChain(address,uint256,uint256)(bool)" \
  "$PRIVY_WALLET" 10000000000000000000000 "$PUBLIC_CHAIN_ID" \
  --private-key "$REGISTERED_PRIVATE_KEY" \
  --rpc-url "$PRIVACY_RPC" \
  --legacy 2>&1 | grep -E "status|Error" || true

echo "  Bridging 50 BondTokens..."
cast send "$BOND_TOKEN_ADDRESS" "teleportToPublicChain(address,uint256,uint256)(bool)" \
  "$PRIVY_WALLET" 50000000000000000000 "$PUBLIC_CHAIN_ID" \
  --private-key "$REGISTERED_PRIVATE_KEY" \
  --rpc-url "$PRIVACY_RPC" \
  --legacy 2>&1 | grep -E "status|Error" || true

echo "  Bridging 100 ABSTokens..."
cast send "$ABS_TOKEN_ADDRESS" "teleportToPublicChain(address,uint256,uint256)(bool)" \
  "$PRIVY_WALLET" 100000000000000000000 "$PUBLIC_CHAIN_ID" \
  --private-key "$REGISTERED_PRIVATE_KEY" \
  --rpc-url "$PRIVACY_RPC" \
  --legacy 2>&1 | grep -E "status|Error" || true

echo ""
echo "Step 3: Waiting 90s for relayer to mint mirror tokens..."
sleep 90

# Step 3: Verify balances
echo ""
echo "=== Verifying balances on Public Chain ==="
echo -n "  Invoice: "
cast call "$INVOICE_MIRROR_ADDRESS" "balanceOf(address)(uint256)" "$PRIVY_WALLET" --rpc-url "$PUBLIC_CHAIN_RPC_URL"
echo -n "  Bond:    "
cast call "$BOND_MIRROR_ADDRESS" "balanceOf(address)(uint256)" "$PRIVY_WALLET" --rpc-url "$PUBLIC_CHAIN_RPC_URL"
echo -n "  ABS:     "
cast call "$ABS_MIRROR_ADDRESS" "balanceOf(address)(uint256)" "$PRIVY_WALLET" --rpc-url "$PUBLIC_CHAIN_RPC_URL"

echo ""
echo "=== DONE ==="
echo "Your Privy wallet now has receipt tokens to test Split/Merge/Buy."
