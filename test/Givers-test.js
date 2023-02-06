// const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
// const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployGiversChain } = require("../instructions");

const ROUNTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

describe("GiversChain", function () {
  let admin, charityWallet, marketingWallet, userA, userB, userC;
  let giversChain;
  const TRANSFER_AMOUNT = ethers.utils.parseEther("10");

  before(async function () {
    [admin, charityWallet, marketingWallet, userA, userB, userC] = await ethers.getSigners();
    giversChain = await deployGiversChain(
      await charityWallet.getAddress(), 
      await marketingWallet.getAddress(),
      ROUNTER_ADDRESS
    );
  });

  it("1. Total supply equal to what you set.", async function () {
    const EXPECTED_TOTAL_SUPPLY = ethers.utils.parseEther("1000000000"); // 1000000000 * 10**18;
    expect(await giversChain.totalSupply()).equal(EXPECTED_TOTAL_SUPPLY);
  });

  describe("2. Transfer to wallets that are excluded and not excluded from fee", async function () {
    it("to excludeFee address", async function () {
      const userAddress = await userA.getAddress();
      await giversChain.excludeFromFee(userAddress);
      expect(await giversChain.isExcludedFromFee(userAddress)).equal(true);
      await expect(
        () => giversChain.transfer(userAddress, TRANSFER_AMOUNT)
      ).changeTokenBalances(giversChain, [admin, userA], [TRANSFER_AMOUNT.mul(-1), TRANSFER_AMOUNT]);
    });
    it("to includeFee address", async function () {
      const accountFrom = await userA.getAddress();
      await giversChain.includeInFee(accountFrom);
      expect(await giversChain.isExcludedFromFee(accountFrom)).equal(false);

      const accountTo = await userB.getAddress();
      await giversChain.includeInFee(accountTo);
      expect(await giversChain.isExcludedFromFee(accountTo)).equal(false);

      const balanceBefore = await giversChain.balanceOf(accountTo);
      const tx = giversChain.connect(userA).transfer(accountTo, TRANSFER_AMOUNT);
      await expect(tx).not.to.reverted;
      const balanceAfter = await giversChain.balanceOf(accountTo);

      const totalFee = TRANSFER_AMOUNT.sub(balanceAfter.sub(balanceBefore));

      // expected Fee is 12% (tax: 2%, liquidy: 3%, marketing: 3%, charity: 3%, burn: 1%)
      const expectedTotalFee = TRANSFER_AMOUNT.mul(12).div(100);
      const error = expectedTotalFee.sub(totalFee);

      // assume as okay if the error is less than 0.0001%
      expect(error.abs()).lte(TRANSFER_AMOUNT.div(1_000_000));
    });
  });

  it("3. Make sure adding liquidity works", async function () {
    const uniswapRouter = await ethers.getContractAt("IUniswapV2Router02", await giversChain.uniswapV2Router());
    const LIQUDITY_AMOUNT = ethers.utils.parseEther("100");

    await expect(giversChain.connect(admin).approve(uniswapRouter.address, LIQUDITY_AMOUNT)).to.not.reverted;
    const timestamp = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
    await expect(
      uniswapRouter
        .connect(admin)
        .addLiquidityETH(giversChain.address, LIQUDITY_AMOUNT, 0, 0, await admin.getAddress(), timestamp + 60, {
          value: ethers.utils.parseEther("10"),
        }),
    ).to.not.reverted;
  });

  it("4. Check that the fees are sent to appropriate wallets correctly", async function () {
    // initialize
    const accountFrom = await userA.getAddress();
    const accountTo = await userB.getAddress();
    await expect(giversChain.transfer(accountFrom, TRANSFER_AMOUNT)).to.not.reverted;
    await giversChain.includeInFee(accountFrom);
    await giversChain.includeInFee(accountTo);
    expect(await giversChain.isExcludedFromFee(accountFrom)).equal(false);
    expect(await giversChain.isExcludedFromFee(accountTo)).equal(false);
    const marketingAddress = await marketingWallet.getAddress();
    const charityAddress = await charityWallet.getAddress();
    const burnAddress = "0x000000000000000000000000000000000000dEaD";
    const numTokensSellToAddToLiquidity = ethers.utils.parseEther("1000000");
    await expect(giversChain.transfer(giversChain.address, numTokensSellToAddToLiquidity.mul(2))).to.not.reverted;

    const balanceMarketingBefore = await ethers.provider.getBalance(marketingAddress);
    const balanceCharityBefore = await ethers.provider.getBalance(charityAddress);
    const balanceBurnBefore = await giversChain.balanceOf(burnAddress);
    const tx = giversChain.connect(userA).transfer(accountTo, TRANSFER_AMOUNT);
    await expect(tx).to.not.reverted;
    const balanceMarketingAfter = await ethers.provider.getBalance(marketingAddress);
    const balanceCharityAfter = await ethers.provider.getBalance(charityAddress);
    const balanceBurnAfter = await giversChain.balanceOf(burnAddress);

    console.log({ balanceMarketingAfter, balanceMarketingBefore });
    console.log({ balanceCharityAfter, balanceCharityBefore });
    console.log({ balanceBurnAfter, balanceBurnBefore });
    expect(balanceMarketingAfter).gt(balanceMarketingBefore);
    expect(balanceCharityAfter).gt(balanceCharityBefore);
    expect(balanceBurnAfter).gt(balanceBurnBefore);
  });

  it("5. Make sure swap and liquify works", async function () {
    const userAddress = await userA.getAddress();
    const tx = giversChain.transfer(userAddress, TRANSFER_AMOUNT);
    await expect(tx).to.emit(giversChain, "SwapAndLiquify");
  });
});
