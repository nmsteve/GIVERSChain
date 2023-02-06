require("hardhat");

module.exports = {
  deployGiversChain: async (charityWallet, marketingWallet, router) => {
    const giversChainFactory = await ethers.getContractFactory("GiversChain");
    const giversChain = await giversChainFactory.deploy(charityWallet, marketingWallet, router);
    await giversChain.deployed();
    return giversChain;
  }
}
