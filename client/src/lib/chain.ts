import { defineChain } from "viem";

export const raylsPublicChain = defineChain({
  id: 7295799,
  name: "Rayls Public Testnet",
  nativeCurrency: { name: "USDr", symbol: "USDr", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.rayls.com/"] },
  },
  blockExplorers: {
    default: {
      name: "Rayls Explorer",
      url: "https://testnet-explorer.rayls.com",
    },
  },
  testnet: true,
});
