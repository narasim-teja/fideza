#!/bin/bash
set -euo pipefail

# Phase 1: Deploy Privacy Node contracts + mint sample assets + register tokens
# Usage: cd contracts && bash script/deploy-phase1.sh

source .env

echo "=== Step 1: Deploy all Phase 1 contracts ==="
forge script script/DeployPhase1.s.sol \
  --rpc-url "$PRIVACY_NODE_RPC_URL" \
  --broadcast \
  --legacy

echo ""
echo "=========================================="
echo "  UPDATE .env with the deployed addresses"
echo "  then press Enter to continue..."
echo "=========================================="
read -r

# Reload env with new addresses
source .env

echo "=== Step 2: Mint sample assets ==="
forge script script/MintSampleAssets.s.sol \
  --rpc-url "$PRIVACY_NODE_RPC_URL" \
  --broadcast \
  --legacy

echo ""
echo "=== Step 3: Register tokens via Rayls API ==="

# Register InvoiceToken (ERC20 = standard 1)
echo "  Registering InvoiceToken (ERC20)..."
curl -s -X POST "$BACKEND_URL/api/user/tokens" \
  -H "Authorization: Bearer $USER_AUTH_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Fideza Invoice Token\", \"symbol\": \"FINV\", \"address\": \"$INVOICE_TOKEN_ADDRESS\", \"uri\": \"\", \"standard\": 1}"
echo ""

# Register BondToken (ERC20 = standard 1)
echo "  Registering BondToken (ERC20)..."
curl -s -X POST "$BACKEND_URL/api/user/tokens" \
  -H "Authorization: Bearer $USER_AUTH_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Fideza Bond - ENERGY A1\", \"symbol\": \"FBOND-EA1\", \"address\": \"$BOND_TOKEN_ADDRESS\", \"uri\": \"\", \"standard\": 1}"
echo ""

# Register ABSToken (ERC20 = standard 1)
echo "  Registering ABSToken (ERC20)..."
curl -s -X POST "$BACKEND_URL/api/user/tokens" \
  -H "Authorization: Bearer $USER_AUTH_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Fideza ABS - Auto Senior A\", \"symbol\": \"FABS-AA\", \"address\": \"$ABS_TOKEN_ADDRESS\", \"uri\": \"\", \"standard\": 1}"
echo ""

echo ""
echo "=== Step 4: Approve tokens via API ==="

curl -s -X PATCH "$BACKEND_URL/api/operator/tokens/status" \
  -H "Authorization: Bearer $OPERATOR_AUTH_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"$INVOICE_TOKEN_ADDRESS\", \"status\": 1}"
echo "  InvoiceToken approved"

curl -s -X PATCH "$BACKEND_URL/api/operator/tokens/status" \
  -H "Authorization: Bearer $OPERATOR_AUTH_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"$BOND_TOKEN_ADDRESS\", \"status\": 1}"
echo "  BondToken approved"

curl -s -X PATCH "$BACKEND_URL/api/operator/tokens/status" \
  -H "Authorization: Bearer $OPERATOR_AUTH_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"$ABS_TOKEN_ADDRESS\", \"status\": 1}"
echo "  ABSToken approved"

echo ""
echo "=== Phase 1 Complete ==="
echo "Verify on Privacy Node explorer: https://blockscout-privacy-node-1.rayls.com"
echo ""
echo "Next: Run cast calls to verify disclosure functions:"
echo "  cast call \$INVOICE_TOKEN_ADDRESS 'getDisclosure(uint256)' 1 --rpc-url \$PRIVACY_NODE_RPC_URL"
echo "  cast call \$BOND_TOKEN_ADDRESS 'getDisclosure()' --rpc-url \$PRIVACY_NODE_RPC_URL"
echo "  cast call \$ABS_TOKEN_ADDRESS 'getPoolAggregates()' --rpc-url \$PRIVACY_NODE_RPC_URL"
