import { ethers } from "ethers";
import { config, abis } from "../config";
import type { ComplianceReport } from "../types";

const RECOMMENDATION_MAP: Record<string, number> = {
  REJECT: 0,
  APPROVE: 1,
  ESCALATE: 2,
};

export async function submitAttestation(
  report: ComplianceReport,
  wallet: ethers.Wallet,
): Promise<string> {
  const complianceStore = new ethers.Contract(
    config.complianceStoreAddress,
    abis.complianceStore,
    wallet,
  );

  // Pre-check: skip if already attested
  const existing = await complianceStore.getAttestation(report.assetId);
  if (existing.timestamp > 0n) {
    console.log(
      `  Attestation already exists for ${report.assetId} (timestamp: ${existing.timestamp}). Skipping.`,
    );
    return "already-attested";
  }

  // Compute disclosureSchemaHash from the disclosure recommendation
  const disclosureSchemaHash = ethers.keccak256(
    ethers.toUtf8Bytes(
      JSON.stringify(report.disclosureRecommendation),
    ),
  );

  const recEnum = RECOMMENDATION_MAP[report.recommendation];

  // Construct the same message that ComplianceStore.sol computes:
  // keccak256(abi.encodePacked(assetId, reportHash, policyVersionHash, uint8(recommendation), riskScore, disclosureSchemaHash))
  const messageHash = ethers.keccak256(
    ethers.solidityPacked(
      ["bytes32", "bytes32", "bytes32", "uint8", "uint256", "bytes32"],
      [
        report.assetId,
        report.reportHash,
        report.policyVersionHash,
        recEnum,
        report.riskScore,
        disclosureSchemaHash,
      ],
    ),
  );

  // Sign with EIP-191 prefix (wallet.signMessage auto-adds "\x19Ethereum Signed Message:\n32")
  // This matches Solidity's toEthSignedMessageHash()
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));

  // Submit on-chain (type: 0 for legacy tx — Privacy Node is gasless, no EIP-1559)
  const tx = await complianceStore.submitAttestation(
    report.assetId,
    report.reportHash,
    report.policyVersionHash,
    signature,
    recEnum,
    report.riskScore,
    disclosureSchemaHash,
    { type: 0 },
  );

  const receipt = await tx.wait();
  return receipt.hash;
}

export async function checkAgentAddress(
  wallet: ethers.Wallet,
): Promise<{ match: boolean; expected: string; actual: string }> {
  const complianceStore = new ethers.Contract(
    config.complianceStoreAddress,
    abis.complianceStore,
    wallet.provider!,
  );
  const expected = await complianceStore.agentAddress();
  const actual = wallet.address;
  return { match: expected.toLowerCase() === actual.toLowerCase(), expected, actual };
}
