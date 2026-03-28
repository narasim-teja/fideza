/**
 * On-chain portfolio construction:
 * 1. Approve bond tokens to vault
 * 2. Create portfolio in PortfolioVault
 * 3. Deploy new VaultShareToken
 * 4. Register share token via Rayls API
 */
import { ethers } from "ethers";
import { config, abis, bytecodes } from "../config";
import type { OptimizedPortfolio } from "../types";

/**
 * Construct portfolio on-chain and deploy share token.
 */
export async function constructPortfolio(
  portfolio: OptimizedPortfolio,
  wallet: ethers.Wallet,
): Promise<{ portfolioId: string; shareTokenAddress: string; txHash: string }> {
  const provider = wallet.provider!;

  // 1. Generate unique portfolio ID
  const nonce = Date.now();
  const timestamp = Math.floor(Date.now() / 1000);
  const portfolioId = ethers.keccak256(
    ethers.solidityPacked(
      ["address", "uint256", "uint256"],
      [wallet.address, timestamp, nonce],
    ),
  );
  console.log(`  Portfolio ID: ${portfolioId}`);

  // 2. Approve each bond token to the vault
  console.log(`  Approving ${portfolio.allocations.length} bond tokens...`);
  for (const alloc of portfolio.allocations) {
    // Use a minimal ERC-20 ABI for approve — works for all token types
    const token = new ethers.Contract(
      alloc.bondTokenAddress,
      ["function approve(address spender, uint256 amount) returns (bool)"],
      wallet,
    );
    const tx = await token.approve(
      config.portfolioVaultAddress,
      alloc.amount,
      { type: 0 },
    );
    await tx.wait();
    console.log(`    Approved ${alloc.assetId.slice(0, 10)}... → ${alloc.amount} tokens`);
  }

  // 3. Create portfolio in vault
  console.log("  Creating portfolio in PortfolioVault...");
  const vault = new ethers.Contract(
    config.portfolioVaultAddress,
    abis.portfolioVault,
    wallet,
  );

  const holdings = portfolio.allocations.map((a) => ({
    assetId: a.assetId,
    bondToken: a.bondTokenAddress,
    amount: a.amount,
    weightBps: a.weightBps,
  }));

  const createTx = await vault.createPortfolio(portfolioId, holdings, { type: 0 });
  const receipt = await createTx.wait();
  console.log(`  Portfolio created: TX ${receipt.hash}`);

  // 4. Deploy VaultShareToken
  console.log("  Deploying VaultShareToken...");
  const shareTokenAddress = await deployShareToken(
    portfolioId,
    portfolio,
    wallet,
  );
  console.log(`  VaultShareToken deployed: ${shareTokenAddress}`);

  // 5. Register via Rayls API (if credentials configured)
  await registerTokenViaAPI(shareTokenAddress, portfolioId);

  return {
    portfolioId,
    shareTokenAddress,
    txHash: receipt.hash,
  };
}

/**
 * Deploy a new VaultShareToken using ContractFactory.
 */
async function deployShareToken(
  portfolioId: string,
  portfolio: OptimizedPortfolio,
  wallet: ethers.Wallet,
): Promise<string> {
  // Read Rayls infrastructure addresses from DeploymentProxyRegistry
  const proxyRegistry = new ethers.Contract(
    config.deploymentProxyRegistryAddress,
    ["function getContract(string calldata name) external view returns (address)"],
    wallet.provider!,
  );

  const [endpoint, rnEndpoint, userGovernance] = await Promise.all([
    proxyRegistry.getContract("Endpoint"),
    proxyRegistry.getContract("RNEndpoint"),
    proxyRegistry.getContract("RNUserGovernance"),
  ]);

  if (endpoint === ethers.ZeroAddress) throw new Error("Endpoint not found in ProxyRegistry");
  if (rnEndpoint === ethers.ZeroAddress) throw new Error("RNEndpoint not found in ProxyRegistry");
  if (userGovernance === ethers.ZeroAddress) throw new Error("RNUserGovernance not found in ProxyRegistry");

  // Total shares = sum of all allocation amounts
  const totalShares = portfolio.allocations.reduce(
    (sum, a) => sum + a.amount,
    0n,
  );

  // Short ID for name/symbol
  const shortId = portfolioId.slice(2, 8).toUpperCase();

  const factory = new ethers.ContractFactory(
    abis.vaultShareToken,
    bytecodes.vaultShareToken,
    wallet,
  );

  const shareToken = await factory.deploy(
    `Fideza Portfolio Share - P${shortId}`,
    `FPS-${shortId}`,
    portfolioId,
    totalShares,
    endpoint,
    rnEndpoint,
    userGovernance,
    { type: 0 },
  );

  await shareToken.waitForDeployment();
  return await shareToken.getAddress();
}

/**
 * Register the share token via Rayls API (POST + PATCH).
 * Silently skips if API credentials are not configured.
 */
async function registerTokenViaAPI(
  tokenAddress: string,
  portfolioId: string,
): Promise<void> {
  if (!config.backendUrl || !config.userAuthKey) {
    console.log("  Skipping API registration (no BACKEND_URL or USER_AUTH_KEY)");
    return;
  }

  const shortId = portfolioId.slice(2, 8).toUpperCase();

  try {
    // Step 1: Register token
    console.log("  Registering share token via Rayls API...");
    const regRes = await fetch(`${config.backendUrl}/api/user/tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.userAuthKey}`,
      },
      body: JSON.stringify({
        name: `Fideza Portfolio Share - P${shortId}`,
        symbol: `FPS-${shortId}`,
        address: tokenAddress,
        uri: "",
        standard: 1,
      }),
    });

    if (!regRes.ok) {
      console.log(`  Token registration returned ${regRes.status}: ${await regRes.text()}`);
    } else {
      console.log("  Token registered");
    }

    // Step 2: Approve token (if operator key available)
    if (config.operatorAuthKey) {
      const appRes = await fetch(`${config.backendUrl}/api/operator/tokens/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.operatorAuthKey}`,
        },
        body: JSON.stringify({
          address: tokenAddress,
          status: 1,
        }),
      });

      if (!appRes.ok) {
        console.log(`  Token approval returned ${appRes.status}: ${await appRes.text()}`);
      } else {
        console.log("  Token approved by operator");
      }
    }
  } catch (e: any) {
    console.log(`  API registration failed (non-fatal): ${e.message}`);
  }
}
