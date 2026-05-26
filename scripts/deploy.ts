import { ethers, network, run } from "hardhat";
import "dotenv/config";

const FEEDS: Record<string, string> = {
  baseSepolia: "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
  base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
};

async function main() {
  const feed = process.env.PRICE_FEED || FEEDS[network.name];
  if (!feed) throw new Error(`No price feed for network ${network.name}`);
  const duration = Number(process.env.ROUND_DURATION || 300);

  console.log(`Deploying PredictionGame to ${network.name}`);
  console.log(`  feed: ${feed}`);
  console.log(`  duration: ${duration}s`);

  const Factory = await ethers.getContractFactory("PredictionGame");
  const game = await Factory.deploy(feed, duration);
  await game.waitForDeployment();
  const addr = await game.getAddress();
  console.log(`PredictionGame deployed at: ${addr}`);

  if (process.env.BASESCAN_API_KEY) {
    console.log("Waiting 30s before verification...");
    await new Promise((r) => setTimeout(r, 30_000));
    try {
      await run("verify:verify", { address: addr, constructorArguments: [feed, duration] });
    } catch (e) {
      console.warn("Verify failed:", e);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
