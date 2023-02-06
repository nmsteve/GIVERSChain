// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {



  // We get the contract to deploy
  const Givers = await hre.ethers.getContractFactory("GiversChain");


  const signers = await ethers.getSigners()

  const charityWallet = signers[1]
  const marketingWallet = signers[2]


  //We Deploy
  const givers = await Givers.deploy(charityWallet.address, marketingWallet.address, process.env.ROUTER02);


  //get address deployed to 
  await givers.deployed();

  //Print address
  console.log("givers deployed to:", givers.address);
  console.log("givers charityWallet:", charityWallet.address);
  console.log("givers marketingWallet:", marketingWallet.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
