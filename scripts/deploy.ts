import { use } from "chai";
import { parseUnits } from "ethers/lib/utils";
import * as fs from "fs";
import { ethers } from "hardhat";
import { Token } from "../typechain";


async function main() {
  const [user, validatorA, validatorB] = await ethers.getSigners();

  const Bridge = await ethers.getContractFactory("Bridge");
  const bridgeA = await Bridge.deploy(validatorA.address);
  await bridgeA.deployed();

  const bridgeB = await Bridge.deploy(validatorA.address);
  await bridgeB.deployed();

  const tokenAddressA = await bridgeA.token();
  const tokenA: Token = await ethers.getContractAt("Token", tokenAddressA);
  await tokenA.mint(user.address, parseUnits("10000"));

  const tokenAddressB = await bridgeA.token();
  const tokenB: Token = await ethers.getContractAt("Token", tokenAddressB);
  await tokenB.mint(user.address, parseUnits("10000"));

  const contracts = {
    bridgeA: bridgeA.address,
    bridgeB: bridgeB.address,
    tokenA: tokenAddressA,
    tokenB: tokenAddressB,
    validatorA: validatorA.address,
    validatorB: validatorA.address,
    deployer: user.address
  };
  
  console.log(contracts);

  fs.writeFile("./tasks/deploy.json", JSON.stringify(contracts), (err) => {
    if (err) throw err;
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});