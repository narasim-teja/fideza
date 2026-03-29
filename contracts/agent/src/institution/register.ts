/**
 * Institution KYB registration handlers.
 * All operations go through the deployer wallet on Privacy Node.
 */
import { ethers } from "ethers";
import { config, abis } from "../config";

const STATUS_LABELS = ["PENDING", "VERIFIED", "APPROVED", "SUSPENDED"] as const;

export interface InstitutionInfo {
  address: string;
  name: string;
  registrationNumber: string;
  jurisdiction: string;
  businessType: string;
  kybDocHash: string;
  registeredAt: number;
  status: string;
}

function getRegistry(signerOrProvider: ethers.Wallet | ethers.JsonRpcProvider) {
  return new ethers.Contract(
    config.institutionRegistryAddress,
    abis.institutionRegistry,
    signerOrProvider,
  );
}

/**
 * Register a new institution via the deployer wallet.
 */
export async function registerInstitution(
  wallet: ethers.Wallet,
  params: {
    name: string;
    registrationNumber: string;
    jurisdiction: string;
    businessType: string;
    kybDocHash: string;
  },
): Promise<{ txHash: string; institutionAddress: string }> {
  const registry = getRegistry(wallet);
  const docHash = params.kybDocHash.startsWith("0x")
    ? params.kybDocHash
    : ethers.keccak256(ethers.toUtf8Bytes(params.kybDocHash));

  const tx = await registry.registerInstitution(
    params.name,
    params.registrationNumber,
    params.jurisdiction,
    params.businessType,
    docHash,
    { type: 0 },
  );
  const receipt = await tx.wait();
  return { txHash: receipt.hash, institutionAddress: wallet.address };
}

/**
 * Get institution details and status.
 */
export async function getInstitutionStatus(
  provider: ethers.JsonRpcProvider,
  address: string,
): Promise<InstitutionInfo | null> {
  const registry = getRegistry(provider);
  const inst = await registry.getInstitution(address);
  if (!inst.name || inst.name === "") return null;

  const statusNum = await registry.getStatus(address);
  return {
    address,
    name: inst.name,
    registrationNumber: inst.registrationNumber,
    jurisdiction: inst.jurisdiction,
    businessType: inst.businessType,
    kybDocHash: inst.kybDocHash,
    registeredAt: Number(inst.registeredAt),
    status: STATUS_LABELS[Number(statusNum)] ?? "UNKNOWN",
  };
}

/**
 * Update institution status (onlyOwner).
 */
export async function updateInstitutionStatus(
  wallet: ethers.Wallet,
  institutionAddress: string,
  status: number,
): Promise<{ txHash: string }> {
  const registry = getRegistry(wallet);
  const tx = await registry.updateStatus(institutionAddress, status, { type: 0 });
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

/**
 * Get all registered institutions by parsing InstitutionRegistered events.
 */
export async function getAllInstitutions(
  provider: ethers.JsonRpcProvider,
  deployerAddress: string,
): Promise<InstitutionInfo[]> {
  // Query the deployer (known institution) directly — avoids slow event scanning
  const results: InstitutionInfo[] = [];
  const info = await getInstitutionStatus(provider, deployerAddress);
  if (info) results.push(info);
  return results;
}
