import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { raylsPublicChain } from "./chain";

export const config = createConfig({
  chains: [raylsPublicChain],
  transports: {
    [raylsPublicChain.id]: http("/rpc"),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
