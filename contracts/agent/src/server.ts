/**
 * Lightweight HTTP API server wrapping the Fideza AI Portfolio Agent.
 *
 * POST /api/portfolio { constraints: {...} }
 * Returns portfolio construction result as JSON.
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

const PORT = Number(process.env.PORT ?? 3001);

async function handlePortfolioRequest(constraintsJson: Record<string, unknown>) {
  const provider = new ethers.JsonRpcProvider(config.privacyNodeRpc);

  if (!config.deployerPrivateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY is required");
  }
  const wallet = new ethers.Wallet(config.deployerPrivateKey, provider);

  // 1. PARSE
  const constraints = parseConstraints(JSON.stringify(constraintsJson));
  validateConstraints(constraints);

  // 2. SCAN
  const bonds = await scanAvailableBonds(provider, constraints);
  if (bonds.length === 0) {
    throw new Error("No bonds match the given constraints");
  }

  // 3. OPTIMIZE
  const portfolio = await optimizePortfolio(bonds, constraints);

  // 4. CONSTRUCT
  const { portfolioId, shareTokenAddress, txHash } = await constructPortfolio(portfolio, wallet);

  // 5. ATTEST
  const attestation = await attestPortfolio(portfolio, portfolioId, bonds, wallet);

  // 6. BRIDGE
  const bridgeResult = await bridgePortfolioShares(shareTokenAddress, attestation, wallet);

  return {
    portfolioId,
    shareTokenAddress,
    createTxHash: txHash,
    attestationTxHash: bridgeResult.attestationTxHash,
    bridgeTxHash: bridgeResult.bridgeTxHash,
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

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/api/portfolio") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const { constraints } = JSON.parse(body);
        if (!constraints) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing constraints" }));
          return;
        }

        console.log("\n=== Portfolio API Request ===");
        console.log("Constraints:", JSON.stringify(constraints, null, 2));

        const result = await handlePortfolioRequest(constraints);

        console.log("\n=== Portfolio API Response ===");
        console.log("Portfolio ID:", result.portfolioId);
        console.log("Bonds:", result.numBonds);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (e: any) {
        console.error("Portfolio API error:", e.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", agent: "fideza-portfolio" }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`Fideza Portfolio Agent API listening on http://localhost:${PORT}`);
  console.log("Endpoints:");
  console.log("  POST /api/portfolio  — Construct AI portfolio");
  console.log("  GET  /health         — Health check");
});
