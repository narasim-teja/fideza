import { ethers } from "ethers";
import { config, abis } from "../config";
import type {
  AssetReadResult,
  InvoiceMetadata,
  BondMetadata,
  ABSMetadata,
  PoolAggregates,
} from "../types";

function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(config.privacyNodeRpc);
}

export async function readInvoice(
  provider?: ethers.JsonRpcProvider,
  contractAddress?: string,
): Promise<AssetReadResult> {
  const p = provider ?? getProvider();
  const contract = new ethers.Contract(
    contractAddress ?? config.invoiceTokenAddress,
    abis.invoiceToken,
    p,
  );

  const [metadata, assetId] = await Promise.all([
    contract.getFullMetadata(),
    contract.getAssetId(),
  ]);

  const m: InvoiceMetadata = {
    invoiceId: metadata.invoiceId,
    issuer: metadata.issuer,
    debtorName: metadata.debtorName,
    debtorJurisdiction: metadata.debtorJurisdiction,
    debtorCreditRating: metadata.debtorCreditRating,
    debtorIndustry: metadata.debtorIndustry,
    faceValue: metadata.faceValue,
    currency: metadata.currency,
    issueDate: metadata.issueDate,
    dueDate: metadata.dueDate,
    paymentTerms: metadata.paymentTerms,
    recourseType: metadata.recourseType,
    priorityClaim: metadata.priorityClaim,
    invoiceDocHash: metadata.invoiceDocHash,
    previouslyTokenized: metadata.previouslyTokenized,
  };

  return { type: "INVOICE", metadata: m, assetId, issuer: m.issuer };
}

export async function readBond(
  provider?: ethers.JsonRpcProvider,
  contractAddress?: string,
): Promise<AssetReadResult> {
  const p = provider ?? getProvider();
  const contract = new ethers.Contract(
    contractAddress ?? config.bondTokenAddress,
    abis.bondToken,
    p,
  );

  const [metadata, assetId] = await Promise.all([
    contract.getFullMetadata(),
    contract.getAssetId(),
  ]);

  const m: BondMetadata = {
    bondId: metadata.bondId,
    isin: metadata.isin,
    issuer: metadata.issuer,
    issuerName: metadata.issuerName,
    issuerJurisdiction: metadata.issuerJurisdiction,
    issuerSector: metadata.issuerSector,
    issuerCreditRating: metadata.issuerCreditRating,
    parValue: metadata.parValue,
    currency: metadata.currency,
    couponRateBps: metadata.couponRateBps,
    couponFrequency: metadata.couponFrequency,
    issueDate: metadata.issueDate,
    maturityDate: metadata.maturityDate,
    seniority: metadata.seniority,
    collateralType: metadata.collateralType,
    covenantSummary: metadata.covenantSummary,
    callProvision: metadata.callProvision,
    offeringType: metadata.offeringType,
    minimumDenomination: metadata.minimumDenomination,
    qualifiedBuyerOnly: metadata.qualifiedBuyerOnly,
    termSheetHash: metadata.termSheetHash,
  };

  return { type: "BOND", metadata: m, assetId, issuer: m.issuer };
}

export async function readABS(
  provider?: ethers.JsonRpcProvider,
  contractAddress?: string,
): Promise<AssetReadResult> {
  const p = provider ?? getProvider();
  const contract = new ethers.Contract(
    contractAddress ?? config.absTokenAddress,
    abis.absToken,
    p,
  );

  const [metadata, poolAgg, assetId] = await Promise.all([
    contract.getFullMetadata(),
    contract.getPoolAggregates(),
    contract.getAssetId(),
  ]);

  const m: ABSMetadata = {
    absId: metadata.absId,
    issuer: metadata.issuer,
    poolType: metadata.poolType,
    totalPoolSize: metadata.totalPoolSize,
    totalPoolNotional: metadata.totalPoolNotional,
    trancheName: metadata.trancheName,
    trancheSeniority: metadata.trancheSeniority,
    trancheSize: metadata.trancheSize,
    creditEnhancementBps: metadata.creditEnhancementBps,
    subordinationLevelBps: metadata.subordinationLevelBps,
    currency: metadata.currency,
    expectedMaturity: metadata.expectedMaturity,
    servicerName: metadata.servicerName,
    auditorName: metadata.auditorName,
    offeringCircularHash: metadata.offeringCircularHash,
    poolTapeHash: metadata.poolTapeHash,
  };

  const pa: PoolAggregates = {
    poolSize: poolAgg.poolSize,
    totalNotional: poolAgg.totalNotional,
    avgCreditScoreRange: poolAgg.avgCreditScoreRange,
    weightedAvgTermBucket: poolAgg.weightedAvgTermBucket,
    delinquencyRateBucket: poolAgg.delinquencyRateBucket,
  };

  return {
    type: "ABS_TRANCHE",
    metadata: m,
    poolAggregates: pa,
    assetId,
    issuer: m.issuer,
  };
}

export async function checkIssuerKYB(
  issuerAddress: string,
  provider?: ethers.JsonRpcProvider,
): Promise<boolean> {
  const p = provider ?? getProvider();
  const registry = new ethers.Contract(
    config.institutionRegistryAddress,
    abis.institutionRegistry,
    p,
  );
  return registry.isApproved(issuerAddress);
}

export async function readAllAssets(
  provider?: ethers.JsonRpcProvider,
): Promise<AssetReadResult[]> {
  const p = provider ?? getProvider();
  const [invoice, bond, abs] = await Promise.all([
    readInvoice(p),
    readBond(p),
    readABS(p),
  ]);
  return [invoice, bond, abs];
}
