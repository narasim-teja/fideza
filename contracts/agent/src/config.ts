import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

function req(name: string): string {
  const v = process.env[name];
  if (!v || v === "0x") {
    console.error(`Missing env var: ${name}`);
    process.exit(1);
  }
  return v;
}

function opt(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

// Load ABI from Foundry compiled artifacts
function loadABI(contractName: string): any[] {
  const artifactPath = path.resolve(
    __dirname,
    `../../out/${contractName}.sol/${contractName}.json`,
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  return artifact.abi;
}

// Load bytecode from Foundry compiled artifacts (for ContractFactory deploys)
function loadBytecode(contractName: string): string {
  const artifactPath = path.resolve(
    __dirname,
    `../../out/${contractName}.sol/${contractName}.json`,
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  return artifact.bytecode.object;
}

export const config = {
  // Network
  privacyNodeRpc: req("PRIVACY_NODE_RPC_URL"),
  publicChainRpc: opt("PUBLIC_CHAIN_RPC_URL", "https://testnet-rpc.rayls.com"),

  // Agent key (must match agentAddress in ComplianceStore)
  agentPrivateKey: req("AGENT_PRIVATE_KEY"),

  // Contract addresses (Privacy Node)
  institutionRegistryAddress: req("INSTITUTION_REGISTRY_ADDRESS"),
  complianceStoreAddress: req("COMPLIANCE_STORE_ADDRESS"),
  invoiceTokenAddress: req("INVOICE_TOKEN_ADDRESS"),
  bondTokenAddress: req("BOND_TOKEN_ADDRESS"),
  absTokenAddress: req("ABS_TOKEN_ADDRESS"),

  // Phase 6 contracts (Privacy Node)
  bondPropertyRegistryAddress: opt("BOND_PROPERTY_REGISTRY_ADDRESS", "0x"),
  portfolioVaultAddress: opt("PORTFOLIO_VAULT_ADDRESS", "0x"),
  vaultShareTokenAddress: opt("VAULT_SHARE_TOKEN_ADDRESS", "0x"),

  // Phase 7: Portfolio construction
  deployerPrivateKey: opt("DEPLOYER_PRIVATE_KEY", ""),
  deploymentProxyRegistryAddress: opt("DEPLOYMENT_PROXY_REGISTRY", "0x"),
  backendUrl: opt("BACKEND_URL", ""),
  userAuthKey: opt("USER_AUTH_KEY", ""),
  operatorAuthKey: opt("OPERATOR_AUTH_KEY", ""),

  // Phase 8: Public Chain contracts
  portfolioAttestationAddress: opt("PORTFOLIO_ATTESTATION_ADDRESS", "0x"),
  bondCatalogAddress: opt("BOND_CATALOG_ADDRESS", "0x"),
  aiAttestationVerifierAddress: opt("AI_ATTESTATION_VERIFIER_ADDRESS", "0x"),
  fidezaLendingPoolAddress: opt("FIDEZA_LENDING_POOL_ADDRESS", "0x"),

  // AI provider settings
  aiProvider: (opt("AI_PROVIDER", "openrouter")) as
    | "anthropic"
    | "openai"
    | "gemini"
    | "openrouter",
  anthropicApiKey: opt("ANTHROPIC_API_KEY", ""),
  openaiApiKey: opt("OPENAI_API_KEY", ""),
  geminiApiKey: opt("GEMINI_API_KEY", ""),
  openrouterApiKey: opt("OPENROUTER_API_KEY", ""),
  openrouterModel: opt("OPENROUTER_MODEL", "auto"),
};

// Bytecodes for ContractFactory deployment
export const bytecodes = {
  vaultShareToken: loadBytecode("VaultShareToken"),
};

// ABIs loaded from compiled Foundry artifacts
export const abis = {
  invoiceToken: loadABI("InvoiceToken"),
  bondToken: loadABI("BondToken"),
  absToken: loadABI("ABSToken"),
  complianceStore: loadABI("ComplianceStore"),
  institutionRegistry: loadABI("InstitutionRegistry"),
  bondPropertyRegistry: loadABI("BondPropertyRegistry"),
  portfolioVault: loadABI("PortfolioVault"),
  vaultShareToken: loadABI("VaultShareToken"),
  portfolioAttestation: loadABI("PortfolioAttestation"),
};
