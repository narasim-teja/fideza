/**
 * Fideza AI Agent HTTP API Server.
 *
 * Endpoints:
 *   POST /api/portfolio              — AI portfolio construction
 *   POST /api/issue                  — Agentic asset issuance (deploy + mint + rate + register)
 *   POST /api/institution/register   — KYB registration
 *   GET  /api/institution/status     — Institution status
 *   POST /api/admin/update-status    — Approve/suspend institution
 *   GET  /api/admin/institutions     — List all institutions
 *   GET  /health                     — Health check
 *
 * Usage: npx tsx src/server.ts
 */
import http from "http";
import { ethers } from "ethers";
import { config } from "./config";
import { parseConstraints, validateConstraints } from "./portfolio/constraints";
import { scanAvailableBonds } from "./portfolio/bondScanner";
import { optimizePortfolio } from "./portfolio/optimizer";
import { constructPortfolio } from "./portfolio/vaultConstructor";
import { attestPortfolio } from "./portfolio/attestor";
import { bridgePortfolioShares } from "./portfolio/bridger";
import {
  registerInstitution,
  getInstitutionStatus,
  updateInstitutionStatus,
  getAllInstitutions,
} from "./institution/register";
import { issueAsset } from "./institution/issueAsset";

const PORT = Number(process.env.PORT ?? 3001);

// Helper: parse JSON body from request
function parseBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => resolve(body));
  });
}

// Helper: send JSON response
function json(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// Helper: get privacy node wallet
function getWallet() {
  const provider = new ethers.JsonRpcProvider(config.privacyNodeRpc);
  if (!config.deployerPrivateKey) throw new Error("DEPLOYER_PRIVATE_KEY required");
  const wallet = new ethers.Wallet(config.deployerPrivateKey, provider);
  return { provider, wallet };
}

// ---------------------------------------------------------------------------
// Portfolio handler (existing)
// ---------------------------------------------------------------------------

async function handlePortfolioRequest(constraintsJson: Record<string, unknown>, recipientAddress?: string, investmentAmount?: string) {
  const { provider, wallet } = getWallet();

  const constraints = parseConstraints(JSON.stringify(constraintsJson));
  validateConstraints(constraints);

  if (investmentAmount) {
    constraints.investmentAmountWei = ethers.parseEther(investmentAmount);
    console.log(`  Investment amount: ${investmentAmount} USDr (${constraints.investmentAmountWei} wei)`);
  }

  const bonds = await scanAvailableBonds(provider, constraints);
  if (bonds.length === 0) throw new Error("No bonds match the given constraints");

  const portfolio = await optimizePortfolio(bonds, constraints);
  const { portfolioId, shareTokenAddress, txHash } = await constructPortfolio(portfolio, wallet);
  const attestation = await attestPortfolio(portfolio, portfolioId, bonds, wallet);
  const bridgeResult = await bridgePortfolioShares(shareTokenAddress, attestation, wallet, recipientAddress);

  return {
    portfolioId, shareTokenAddress, createTxHash: txHash,
    attestationTxHash: bridgeResult.attestationTxHash,
    bridgeTxHash: bridgeResult.bridgeTxHash,
    transferToUserTxHash: bridgeResult.transferToUserTxHash,
    numBonds: attestation.numBonds,
    diversificationScore: attestation.diversificationScore,
    weightedCouponBps: attestation.weightedCouponBps,
    ratingRange: attestation.ratingRange,
    avgMaturityMonths: attestation.avgMaturityMonths,
    maxSingleExposurePct: attestation.maxSingleExposurePct,
    totalValue: attestation.totalValue.toString(),
    methodologyHash: attestation.methodologyHash,
  };
}

// ---------------------------------------------------------------------------
// HTTP Server
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = req.url?.split("?")[0];
  const query = new URLSearchParams(req.url?.split("?")[1] ?? "");

  try {
    // ----- POST /api/portfolio -----
    if (req.method === "POST" && url === "/api/portfolio") {
      const { constraints, recipientAddress, investmentAmount } = JSON.parse(await parseBody(req));
      if (!constraints) return json(res, 400, { error: "Missing constraints" });

      console.log("\n=== Portfolio API Request ===");
      console.log("Constraints:", JSON.stringify(constraints, null, 2));
      if (recipientAddress) console.log("Recipient:", recipientAddress);
      if (investmentAmount) console.log("Investment:", investmentAmount, "USDr");

      const result = await handlePortfolioRequest(constraints, recipientAddress, investmentAmount);
      console.log("=== Portfolio Complete ===\n");
      return json(res, 200, result);
    }

    // ----- POST /api/issue -----
    if (req.method === "POST" && url === "/api/issue") {
      const { assetType, metadata, totalSupply } = JSON.parse(await parseBody(req));
      if (!assetType || !metadata) return json(res, 400, { error: "Missing assetType or metadata" });

      console.log(`\n=== Asset Issuance Request: ${assetType.toUpperCase()} ===`);
      const { wallet } = getWallet();
      const result = await issueAsset(
        { assetType, metadata, totalSupply: totalSupply ?? "10000" },
        wallet,
      );
      console.log(`=== Issuance Complete: ${result.rating} (score ${result.riskScore}) ===\n`);
      return json(res, 200, result);
    }

    // ----- POST /api/institution/register -----
    if (req.method === "POST" && url === "/api/institution/register") {
      const params = JSON.parse(await parseBody(req));
      if (!params.name) return json(res, 400, { error: "Missing name" });

      console.log(`\n=== Institution Registration: ${params.name} ===`);
      const { wallet } = getWallet();
      const result = await registerInstitution(wallet, params);
      console.log(`  Registered: ${result.institutionAddress}`);
      return json(res, 200, result);
    }

    // ----- GET /api/institution/status -----
    if (req.method === "GET" && url === "/api/institution/status") {
      const address = query.get("address") ?? getWallet().wallet.address;
      const { provider } = getWallet();
      const info = await getInstitutionStatus(provider, address);
      if (!info) return json(res, 404, { error: "Institution not found" });
      return json(res, 200, info);
    }

    // ----- POST /api/admin/update-status -----
    if (req.method === "POST" && url === "/api/admin/update-status") {
      const { institutionAddress, status } = JSON.parse(await parseBody(req));
      if (!institutionAddress || status === undefined) return json(res, 400, { error: "Missing institutionAddress or status" });

      console.log(`\n=== Admin: Update Status → ${["PENDING","VERIFIED","APPROVED","SUSPENDED"][status]} ===`);
      const { wallet } = getWallet();
      const result = await updateInstitutionStatus(wallet, institutionAddress, status);
      return json(res, 200, result);
    }

    // ----- GET /api/admin/institutions -----
    if (req.method === "GET" && url === "/api/admin/institutions") {
      const { provider } = getWallet();
      const institutions = await getAllInstitutions(provider);
      return json(res, 200, { institutions });
    }

    // ----- GET /health -----
    if (req.method === "GET" && url === "/health") {
      return json(res, 200, { status: "ok", agent: "fideza" });
    }

    json(res, 404, { error: "Not found" });
  } catch (e: any) {
    console.error("API error:", e.message);
    json(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`Fideza AI Agent API listening on http://localhost:${PORT}`);
  console.log("Endpoints:");
  console.log("  POST /api/portfolio              — AI portfolio construction");
  console.log("  POST /api/issue                  — Agentic asset issuance");
  console.log("  POST /api/institution/register    — KYB registration");
  console.log("  GET  /api/institution/status      — Institution status");
  console.log("  POST /api/admin/update-status     — Update institution status");
  console.log("  GET  /api/admin/institutions      — List all institutions");
  console.log("  GET  /health                      — Health check");
});
