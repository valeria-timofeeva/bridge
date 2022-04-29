import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { BigNumber, utils } from "ethers";
import { arrayify, parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { Token } from "../typechain";
import { Bridge } from "../typechain/Bridge";


describe("Bridge", function () {
  let clean: any;
  let bridgeA: Bridge;
  let bridgeB: Bridge;
  let tokenA: Token;
  let tokenB: Token;
  let user: SignerWithAddress,
    user2: SignerWithAddress,
    validatorA: SignerWithAddress,
    validatorB: SignerWithAddress,
    notValidator: SignerWithAddress;

  const _AMOUNT = parseUnits("500");

  before(async () => {
    [user, user2, validatorA, validatorB, notValidator] = await ethers.getSigners();

    const Bridge = await ethers.getContractFactory("Bridge");

    bridgeA = await Bridge.deploy(validatorB.address);
    await bridgeA.deployed();

    bridgeB = await Bridge.deploy(validatorA.address);
    await bridgeB.deployed();

    tokenA = await ethers.getContractAt("Token", await bridgeA.token());
    tokenB = await ethers.getContractAt("Token", await bridgeB.token());

    await tokenA.mint(user.address, _AMOUNT);
    clean = await network.provider.send("evm_snapshot");
  });

  afterEach(async () => {
    await network.provider.send("evm_revert", [clean]);
    clean = await network.provider.send("evm_snapshot");
  });

  describe("Set validator", function () {
    it("Should set validator", async function () {
      expect(await bridgeA.validator()).to.be.equal(validatorB.address);
      await bridgeA.setValidator(validatorA.address);
      expect(await bridgeA.validator()).to.be.equal(validatorA.address);
    });

  });
  describe("swap", function () {
    it("Reverts: Not enought founds", async function () {
      await expect(bridgeA.swap(user.address, parseUnits("1000"))).to.be.revertedWith(
        "ERC20: burn amount exceeds balance"
      );
    });

    it("Reverts: Swap to zero address", async function () {
      await expect(bridgeA.swap("0x0000000000000000000000000000000000000000", parseUnits("10"))).to.be.revertedWith(
        "CannotBeZero"
      );
    });

    it("Should swap to receiving address", async function () {
      await expect(bridgeA.swap(user.address, _AMOUNT))
        .to.emit(bridgeA, "Swap")
        .withArgs(user.address, user.address, _AMOUNT, BigNumber.from("0"));

      expect(await tokenA.balanceOf(user.address)).to.be.equal(0);
      expect(await bridgeA.id()).to.be.equal(BigNumber.from("1"));

    });
  });

  describe("redeem", function () {
    it("Reverts: Id of swap already used", async function () {
      const id = await bridgeA.id();

      const msg = utils.solidityKeccak256(
        ["address", "uint256", "uint256"],
        [user2.address, parseUnits("100"), id]
      );
      const signature = await validatorA.signMessage(arrayify(msg));

      await bridgeB.redeem(user2.address, parseUnits("100"), id, signature);
      await expect(bridgeB.redeem(user2.address, parseUnits("100"), id, signature)).to.be.revertedWith("AlreadyRedeem");
    });

    it("Reverts: Signature is not valid", async function () {
      const id = await bridgeA.id();
      const msg = utils.solidityKeccak256(
        ["address", "uint256", "uint256"],
        [user2.address, parseUnits("100"), id]
      );
      const signature = await notValidator.signMessage(arrayify(msg));
      await expect(bridgeB.redeem(user2.address, parseUnits("100"), id, signature)).to.be.revertedWith("NotValidator");
    });

    it("Should redeem to receiving address", async function () {
      const id = await bridgeA.id();
      const msg = utils.solidityKeccak256(
        ["address", "uint256", "uint256"],
        [user2.address, parseUnits("100"), id]
      );
      const signature = await validatorA.signMessage(arrayify(msg));
      await expect(bridgeB.redeem(user2.address, parseUnits("100"), id, signature))
        .to.emit(bridgeB, "Redeem")
        .withArgs(user2.address, parseUnits("100"), id);
      expect(await tokenB.balanceOf(user2.address)).to.be.equal(parseUnits("100"));
    });
  });
});

