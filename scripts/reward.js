// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {



  // We get the contract to deploy
  const Reward = await hre.ethers.getContractFactory("Reward");



  //We Deploy
  const reward = await Reward.deploy('VAS Rewards', 'VAS', hre.ethers.utils.parseEther('1000000000'));


  //get address deployed to 
  await reward.deployed();

  //Print address

  console.log("Reward deployed to:", reward.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
