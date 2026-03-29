/**
 * ZK Bond Rating Integrity Proof Generator
 *
 * Proves the AI agent's published rating and risk score honestly derive
 * from the private bond metadata on the Privacy Node.
 */
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { config, abis } from "../config";
import { ratingToIndex } from "./constraints";

const CIRCUIT_DIR = path.resolve(__dirname, "../../../../circuits/rating_proof");

interface BondMetadata {
  couponRateBps: number;
  maturityMonths: number;
  hasCollateral: boolean;
  seniorityIndex: number; // 0=senior secured, 1=senior unsecured, 2=subordinated, 3=junior
}

interface PublishedRating {
  ratingIndex: number;
  riskScore: number;
  hasCollateral: boolean;
  couponRange: number; // 0="0-3%", 1="3-6%", 2="6-10%", 3="10%+"
}

function computeCouponRange(couponRateBps: number): number {
  if (couponRateBps < 300) return 0;
  if (couponRateBps < 600) return 1;
  if (couponRateBps < 1000) return 2;
  return 3;
}

function computeRiskScore(meta: BondMetadata): number {
  const isHighQuality = meta.couponRateBps < 300 && meta.hasCollateral && meta.seniorityIndex <= 1;
  const isMidQuality = meta.couponRateBps < 600 && (meta.hasCollateral || meta.seniorityIndex <= 1);
  const isSpeculative = meta.couponRateBps < 1000;

  let base = 65;
  if (isHighQuality) base = 10;
  else if (isMidQuality) base = 25;
  else if (isSpeculative) base = 45;

  let couponPenalty = 15;
  if (meta.couponRateBps < 200) couponPenalty = 0;
  else if (meta.couponRateBps < 400) couponPenalty = 5;
  else if (meta.couponRateBps < 700) couponPenalty = 10;

  let maturityPenalty = 15;
  if (meta.maturityMonths < 24) maturityPenalty = 0;
  else if (meta.maturityMonths < 60) maturityPenalty = 5;
  else if (meta.maturityMonths < 120) maturityPenalty = 10;

  const collateralBonus = meta.hasCollateral ? 10 : 0;

  return base + couponPenalty + maturityPenalty - collateralBonus;
}

function generateProverToml(meta: BondMetadata, published: PublishedRating): string {
  return [
    `coupon_rate_bps = "${meta.couponRateBps}"`,
    `maturity_months = "${meta.maturityMonths}"`,
    `has_collateral = ${meta.hasCollateral}`,
    `seniority_index = "${meta.seniorityIndex}"`,
    "",
    `published_rating_index = "${published.ratingIndex}"`,
    `published_risk_score = "${published.riskScore}"`,
    `published_has_collateral = ${published.hasCollateral}`,
    `published_coupon_range = "${published.couponRange}"`,
  ].join("\n");
}

/**
 * Fetch bond metadata from Privacy Node and published rating from BondCatalog.
 */
async function fetchBondData(assetId: string): Promise<{ meta: BondMetadata; published: PublishedRating }> {
  const provider = new ethers.JsonRpcProvider(config.privacyNodeRpc);
  const wallet = new ethers.Wallet(config.agentPrivateKey, provider);

  const registry = new ethers.Contract(config.bondPropertyRegistryAddress, abis.bondPropertyRegistry, wallet);
  const bond = await registry.getBond(assetId);

  const meta: BondMetadata = {
    couponRateBps: Number(bond.couponRateBps),
    maturityMonths: Number(bond.maturityMonths ?? 60),
    hasCollateral: bond.hasCollateral ?? true,
    seniorityIndex: Number(bond.seniorityIndex ?? 1),
  };

  const riskScore = computeRiskScore(meta);
  const published: PublishedRating = {
    ratingIndex: ratingToIndex(bond.rating),
    riskScore,
    hasCollateral: meta.hasCollateral,
    couponRange: computeCouponRange(meta.couponRateBps),
  };

  return { meta, published };
}

/**
 * Generate ZK rating integrity proof for a bond.
 */
async function generateRatingProof(assetId: string) {
  console.log(`\n=== ZK Bond Rating Integrity Proof ===\n`);
  console.log(`  Asset: ${assetId}`);

  const { meta, published } = await fetchBondData(assetId);
  console.log("  Metadata:", meta);
  console.log("  Published:", published);

  const toml = generateProverToml(meta, published);
  fs.writeFileSync(path.join(CIRCUIT_DIR, "Prover.toml"), toml);

  console.log("  Compiling circuit...");
  execSync("nargo compile", { cwd: CIRCUIT_DIR, stdio: "pipe" });
  console.log("  Generating witness...");
  execSync("nargo execute", { cwd: CIRCUIT_DIR, stdio: "pipe" });
  console.log("  Generating proof...");
  execSync(
    "bb prove -b target/rating_proof.json -w target/rating_proof.gz -o target/proof -t evm-no-zk",
    { cwd: CIRCUIT_DIR, stdio: "pipe" },
  );

  const proofBytes = fs.readFileSync(path.join(CIRCUIT_DIR, "target/proof/proof"));
  console.log(`  Proof size: ${proofBytes.length} bytes`);

  const publicInputs = [
    ethers.zeroPadValue(ethers.toBeHex(published.ratingIndex), 32),
    ethers.zeroPadValue(ethers.toBeHex(published.riskScore), 32),
    ethers.zeroPadValue(ethers.toBeHex(published.hasCollateral ? 1 : 0), 32),
    ethers.zeroPadValue(ethers.toBeHex(published.couponRange), 32),
  ];

  return { proof: proofBytes, publicInputs, published };
}

export { generateRatingProof, computeRiskScore, computeCouponRange };
