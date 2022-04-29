
import { task } from "hardhat/config";
import { parseUnits } from "ethers/lib/utils";
import { utils } from "ethers";
import { Token } from "../typechain";

const contractInfo = require("./deploy.json");

task
    ("swap", "Writes off tokens from user for another network")
    .addParam("receivingAddress", "Receiving")
    .addParam("amount", "Amount of tokens")
    .setAction(async (taskArgs, hre) => {
        const contract = await hre.ethers.getContractAt("Bridge", contractInfo.bridgeA);
        const [user, validatorA] = await hre.ethers.getSigners();

        const tokenAddressA = await contract.token();
        const tokenA: Token = await hre.ethers.getContractAt("Token", tokenAddressA);
        await tokenA.connect(user).approve(contract.address, parseUnits("100"));

        const id = await contract.id();
        await contract.swap(taskArgs.receivingAddress, parseUnits(taskArgs.amount));
        const msg = utils.solidityKeccak256(
            ["address", "uint256", "uint256"],
            [taskArgs.receivingAddress, parseUnits(taskArgs.amount), id]
        );
        const signature = await validatorA.signMessage(utils.arrayify(msg));
        console.log(signature);
    });

task
    ("redeem", "Accepts(redeem) tokens after swap another network")
    .addParam("receivingAddress", "Receiving")
    .addParam("amount", "Amount of tokens")
    .addParam("id", "Id of swapping")
    .addParam("signature", "Signature of bridge validator")
    .setAction(async (taskArgs, hre) => {
        const contract = await hre.ethers.getContractAt("Bridge", contractInfo.bridgeB);
        const [user] = await hre.ethers.getSigners();

        const tokenAddressB = await contract.token();
        const tokenB: Token = await hre.ethers.getContractAt("Token", tokenAddressB);
        await tokenB.connect(user).approve(contract.address, parseUnits("100"));

        const tx = await contract.redeem(
            taskArgs.receivingAddress,
            parseUnits(taskArgs.amount),
            taskArgs.id,
            taskArgs.signature
        );

        console.log("Successfull: ", tx);
    });