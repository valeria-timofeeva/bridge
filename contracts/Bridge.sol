//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "./Token.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
    @dev Errors
 */

error CannotBeZero();
error AlreadyRedeem();
error NotValidator();

/**
    @title smart contract for transfer token to another chain
    @author Valeria Timofeeva
 */
contract Bridge is Ownable {
    using ECDSA for bytes32;

    uint256 public id;
    Token public token;
    address public validator;
    mapping(uint256 => mapping(uint256 => bool)) public redeemed;

    /**
        @dev Events
     */

    event Swap(
        address from,
        address to,
        uint256 amount,
        uint256 id,
        uint256 chainid,
        uint256 chainidFrom
    );
    event Redeem(address to, uint256 amount, uint256 id, uint256 chainid);

    constructor(address _validator) {
        token = new Token();
        validator = _validator;
    }

    /// @dev Set validator
    /// @param _validator address
    function setValidator(address _validator) external onlyOwner {
        validator = _validator;
    }

    /// @dev Writes off tokens from user for another network
    /// @param receivingAddress is another side address
    /// @param amount of tokens
    function swap(
        address receivingAddress,
        uint256 amount,
        uint256 chainidTo
    ) external {
        token.burn(msg.sender, amount);
        if (receivingAddress == address(0)) revert CannotBeZero();

        emit Swap(
            msg.sender,
            receivingAddress,
            amount,
            id,
            chainidTo,
            block.chainid
        );
        id++;
    }

    /// @dev Accepts(redeem) tokens after swap another network
    /// @param receivingAddress is another side address
    /// @param amount of tokens
    function redeem(
        address receivingAddress,
        uint256 amount,
        uint256 id_,
        uint256 chainidFrom,
        bytes memory signature
    ) external {
        if (redeemed[chainidFrom][id_] == true) revert AlreadyRedeem();

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                receivingAddress,
                amount,
                id_,
                block.chainid,
                chainidFrom
            )
        ).toEthSignedMessageHash();
        redeemed[chainidFrom][id_] = true;

        if (messageHash.recover(signature) != validator) revert NotValidator();
        token.mint(receivingAddress, amount);

        emit Redeem(receivingAddress, amount, id_, block.chainid);
    }
}
