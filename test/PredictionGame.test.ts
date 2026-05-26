import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictionGame", function () {
  async function deploy() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Mock = await ethers.getContractFactory("MockAggregator");
    const feed = await Mock.deploy(8, 3000_00000000n);
    const Game = await ethers.getContractFactory("PredictionGame");
    const game = await Game.deploy(await feed.getAddress(), 60);
    return { game, feed, owner, alice, bob };
  }

  it("runs a full round with UP winner", async function () {
    const { game, feed, alice, bob } = await deploy();
    await game.startRound();
    await game.connect(alice).bet(true, { value: ethers.parseEther("1") });
    await game.connect(bob).bet(false, { value: ethers.parseEther("1") });
    await ethers.provider.send("evm_increaseTime", [61]);
    await feed.setPrice(3100_00000000n);
    await game.endRound();
    const before = await ethers.provider.getBalance(alice.address);
    const tx = await game.connect(alice).claim(1);
    const r = await tx.wait();
    const gas = r!.gasUsed * r!.gasPrice;
    const after = await ethers.provider.getBalance(alice.address);
    // Alice gets 1 ETH stake + (1 ETH loser pool - 2% fee) = 1.98 ETH
    const gained = after - before + gas;
    expect(gained).to.be.closeTo(ethers.parseEther("1.98"), ethers.parseEther("0.001"));
  });

  it("refunds on tie", async function () {
    const { game, feed, alice } = await deploy();
    await game.startRound();
    await game.connect(alice).bet(true, { value: ethers.parseEther("0.5") });
    await ethers.provider.send("evm_increaseTime", [61]);
    await game.endRound();
    const before = await ethers.provider.getBalance(alice.address);
    const tx = await game.connect(alice).claim(1);
    const r = await tx.wait();
    const gas = r!.gasUsed * r!.gasPrice;
    const after = await ethers.provider.getBalance(alice.address);
    expect(after - before + gas).to.equal(ethers.parseEther("0.5"));
  });
});
