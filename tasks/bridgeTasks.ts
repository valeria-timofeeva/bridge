
import { task } from "hardhat/config";
import { parseUnits } from "ethers/lib/utils";
import { utils } from "ethers";
import { Token } from "../typechain";

const contractInfo = require("./deploy.json");

task
    ("swap", "Writes off tokens from user for another network")
    .addParam("receivingaddress", "Receiving")
    .addParam("amount", "Amount of tokens")
    .addParam("chainidto", "Destination chain")
    .setAction(async (taskArgs, hre) => {
        const contract = await hre.ethers.getContractAt("Bridge", contractInfo.bridgeA);
        const [user, validatorA] = await hre.ethers.getSigners();

        const tokenAddressA = await contract.token();
        const tokenA: Token = await hre.ethers.getContractAt("Token", tokenAddressA);
        await tokenA.connect(user).approve(contract.address, parseUnits("100"));

        const id = await contract.id();
        await contract.swap(taskArgs.receivingaddress, parseUnits(taskArgs.amount), taskArgs.chainidto);
        const network = await hre.ethers.provider.getNetwork();
        console.log(network.chainId);
        const msg = utils.solidityKeccak256(
            ["address", "uint256", "uint256", "uint256", "uint256"],
            [taskArgs.receivingaddress, parseUnits(taskArgs.amount), id, taskArgs.chainidto, network.chainId]
        );
        const signature = await validatorA.signMessage(utils.arrayify(msg));
        console.log(signature);
    });

task
    ("redeem", "Accepts(redeem) tokens after swap another network")
    .addParam("receivingaddress", "Receiving")
    .addParam("amount", "Amount of tokens")
    .addParam("id", "Id of swapping")
    .addParam("chainidfrom", "Chain from send")
    .addParam("signature", "Signature of bridge validator")
    .setAction(async (taskArgs, hre) => {
        const contract = await hre.ethers.getContractAt("Bridge", contractInfo.bridgeB);
        const tx = await contract.redeem(
            taskArgs.receivingaddress,
            parseUnits(taskArgs.amount),
            taskArgs.id,
            taskArgs.chainidfrom,
            taskArgs.signature
        );
        console.log("Successfull: ", tx);
    });