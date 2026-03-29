# Fideza — AI-Rated Private Credit Protocol

**Fideza** is a private credit protocol built on [Rayls](https://rayls.com) where institutions privately issue debt instruments (corporate bonds, ABS tranches, invoices), an AI agent rates them using a public, cryptographically-attested methodology, and end users can invest in AI-constructed custom portfolios of rated debt, deployed as vaults with tokenized shares. A lending pool enables vault share holders to borrow USDr against their illiquid positions.

---

## Three Layers

### Layer 1: Private Issuance + AI Rating

Institutions issue bonds on the Privacy Node with full private metadata (financials, exact coupon rates, covenant terms). The AI Rating Agent reads this private data, applies a deterministic + LLM-powered compliance methodology, and produces a credit rating (AAA through CCC). The rating is ECDSA-signed and attested on-chain. Only bucketed, privacy-preserving properties cross to the public chain — exact terms stay private.

**6-stage pipeline:** `READ → VALIDATE → ANALYZE → DISCLOSE → REPORT → ATTEST`

- **Deterministic checks:** KYB verification, jurisdiction screening, sanctions, schema completeness, value limits, maturity range, credit rating validation
- **LLM analysis:** Covenant quality assessment (bonds), payment terms analysis (invoices), pool composition evaluation (ABS)
- **Privacy-preserving disclosure:** AI auto-categorizes each metadata field as Public, Bucketed (e.g., coupon 5.75% → "3-6%"), or Withheld (e.g., issuer name)
- **On-chain attestation:** ECDSA-signed report hash stored in ComplianceStore

### Layer 2: AI Portfolio Construction (Dark Pool)

Users specify investment constraints ("BBB-AA, ~7% yield, max diversification") and an investment amount in USDr. The AI Portfolio Agent constructs an optimal portfolio from the rated bond universe:

**6-stage pipeline:** `PARSE → SCAN → OPTIMIZE → CONSTRUCT → ATTEST → BRIDGE`

- **LLM optimization** (Gemini 2.5 Flash): Proposes weight allocations based on yield targets, risk tolerance, diversification, and maturity preferences
- **Greedy fallback:** Deterministic equal-weight allocation if LLM output fails validation
- **Dark pool:** Portfolio vault holds actual bond tokens on Privacy Node. Composition stays private. Only aggregate metrics (total value, yield, diversification score, rating range) are attested on the public chain
- **Vault shares:** ERC-20 tokens representing portfolio ownership, bridged to public chain via Rayls teleport

### Layer 3: Lending Pool

Vault share holders can borrow USDr against their illiquid portfolio positions:

- **150% collateral ratio** — overcollateralized lending
- **10% APY** for lenders who deposit USDr
- **120% liquidation threshold** — anyone can liquidate undercollateralized positions
- **AI verification** — lending pool verifies portfolio attestation signature before accepting collateral

---

## Agentic Asset Issuance

Institutions issue new debt instruments through an AI-powered pipeline that deploys, mints, rates, and registers assets in a single flow:

**4-stage pipeline:** `DEPLOY → MINT → RATE → REGISTER`

1. Deploys a new token contract (BondToken/InvoiceToken/ABSToken) on the Privacy Node
2. Initializes with full metadata and mints token supply
3. Runs the complete 6-stage AI compliance pipeline — deterministic rules + LLM analysis
4. Assigns credit rating (AAA-CCC) and registers in BondPropertyRegistry for portfolio inclusion

---

## Architecture

```
Privacy Node (Gasless)                          Public Chain (USDr Gas)
================================                ================================
InstitutionRegistry (KYB)                       BondCatalog (rated properties)
ComplianceStore (AI attestations)               PortfolioAttestation (aggregate metrics)
DisclosureGate (governance)                     AIAttestationVerifier
BondPropertyRegistry (full data)                FidezaLendingPool (10% APY)
PortfolioVault (dark pool)                      VaultShareToken mirrors
BondToken / InvoiceToken / ABSToken
VaultShareToken (bridgeable)

        AI Agent Server (port 3001)
        ├── Rating Pipeline (compliance)
        ├── Portfolio Pipeline (construction)
        └── Issuance Pipeline (deploy + rate)
```

**Privacy guarantees:**
- Bond tokens never leave the Privacy Node
- Portfolio composition is a dark pool — only aggregate metrics are public
- Exact coupon rates, issuer names, covenant terms are withheld or bucketed
- AI reads private data, outputs only ratings + aggregates

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.24, Foundry, OpenZeppelin |
| AI Agent | TypeScript, ethers.js, OpenRouter (Gemini 2.5 Flash) |
| Frontend | Next.js 16, Tailwind v4, shadcn/ui, wagmi v3, viem |
| Wallet | Privy (embedded wallet) |
| Privacy | Rayls Privacy Node + Public Chain |
| Bridge | RaylsErc20Handler (teleportToPublicChain) |

---

## Key Flows

### Institution Issues a Bond
```
Admin approves institution (KYB) → Institution fills bond details →
AI Agent deploys contract → mints tokens → runs 9 compliance checks →
LLM analyzes covenants → assigns AAA rating → registers in catalog
```

### User Invests in AI Portfolio
```
User deposits 10 USDr → specifies constraints (rating, yield, risk) →
AI scans 12+ rated instruments → LLM optimizes allocation →
creates on-chain vault → deploys share token → signs attestation →
bridges shares to user's wallet on public chain
```

### User Borrows Against Portfolio
```
User deposits vault shares as collateral → lending pool verifies
AI attestation signature → user borrows USDr at 10% APY →
if collateral ratio drops below 120% → liquidation triggered
```

---

## AI Agents

### Rating Agent
- **Input:** Full private metadata from Privacy Node
- **Checks:** KYB verification, jurisdiction/sanctions screening, schema validation, value limits, maturity range, credit rating validity, LLM covenant/payment/pool analysis
- **Output:** Risk score (0-100), credit rating (AAA-CCC), recommendation (APPROVE/REJECT/ESCALATE), ECDSA-signed attestation
- **Privacy:** Only the rating + bucketed properties are disclosed. Raw financials stay private.

### Portfolio Agent
- **Input:** User constraints (rating range, yield target, risk tolerance, investment amount)
- **Optimization:** Gemini 2.5 Flash proposes weight allocations, validated against hard constraints (weight sum = 10000 bps, max exposure, min bonds, asset type diversity)
- **Output:** On-chain vault with bond tokens, share token bridged to public chain, signed attestation of aggregate metrics
- **Privacy:** Portfolio composition is a dark pool. Only aggregate metrics (yield, diversification, rating range) are public.
