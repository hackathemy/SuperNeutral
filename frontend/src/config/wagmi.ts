"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, arbitrumSepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "ETH Lending Protocol",
  projectId: "YOUR_PROJECT_ID", // Get from https://cloud.walletconnect.com
  chains: [sepolia, arbitrumSepolia],
  ssr: true,
});
