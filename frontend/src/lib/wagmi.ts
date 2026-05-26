import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, baseSepolia } from "wagmi/chains";

const wcId = import.meta.env.VITE_WC_PROJECT_ID || "demo";
const chain = import.meta.env.VITE_CHAIN === "base" ? base : baseSepolia;

export const activeChain = chain;

export const config = getDefaultConfig({
  appName: "BasePredict",
  projectId: wcId,
  chains: [chain],
  ssr: false,
});

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
