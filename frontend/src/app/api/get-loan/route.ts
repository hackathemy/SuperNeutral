import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { CONTRACTS } from "@/config/contracts";
import { EthereumLendingPoolABI } from "@/lib/abis/EthereumLendingPool";

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("tokenId");

    if (!tokenId) {
      return NextResponse.json(
        { error: "Missing tokenId parameter" },
        { status: 400 }
      );
    }

    const loan = await publicClient.readContract({
      address: CONTRACTS.LendingPool,
      abi: EthereumLendingPoolABI,
      functionName: "loans",
      args: [BigInt(tokenId)],
    });

    // loan is a tuple: [borrower, collateral, debt, liquidationRatio, shortRatio, timestamp]
    return NextResponse.json({
      borrower: loan[0],
      collateral: loan[1].toString(),
      debt: loan[2].toString(),
      liquidationRatio: loan[3].toString(),
      shortRatio: loan[4].toString(),
      timestamp: loan[5].toString(),
    });
  } catch (error) {
    console.error("Error getting loan:", error);
    return NextResponse.json(
      { error: "Failed to get loan" },
      { status: 500 }
    );
  }
}
