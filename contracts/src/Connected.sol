// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IGatewayEVM, RevertOptions} from "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";

/// @title Minimal Connected contract on a connected EVM chain
/// @notice Forwards calls to ZetaChain Universal App via GatewayEVM
contract Connected {
    IGatewayEVM public immutable gateway;
    address public owner;

    event ForwardCalled(
        address receiver,
        bytes message,
        RevertOptions revertOptions
    );
    event ForwardDepositAndCall(
        address asset,
        uint256 amount,
        address receiver,
        bytes message,
        RevertOptions revertOptions
    );
    event OwnershipTransferred(
        address indexed prevOwner,
        address indexed newOwner
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(address gatewayEVM) {
        require(gatewayEVM != address(0), "GATEWAY_ZERO");
        gateway = IGatewayEVM(gatewayEVM);
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "OWNER_ZERO");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Forward an authenticated message to ZetaChain Universal without asset transfer
    function forwardCall(
        address receiver,
        bytes calldata message,
        RevertOptions calldata revertOptions
    ) external onlyOwner {
        gateway.call(receiver, message, revertOptions);
        emit ForwardCalled(receiver, message, revertOptions);
    }

    /// @notice Deposit ERC-20 and call Universal App on ZetaChain
    function forwardDepositAndCall(
        address asset,
        uint256 amount,
        address receiver,
        bytes calldata message,
        RevertOptions calldata revertOptions
    ) external onlyOwner {
        require(asset != address(0) && amount > 0, "BAD_PARAMS");
        // approve is done off-contract by the EOA before calling this method, or you can extend to pull & approve.
        gateway.depositAndCall(receiver, amount, asset, message, revertOptions);
        emit ForwardDepositAndCall(
            asset,
            amount,
            receiver,
            message,
            revertOptions
        );
    }
}
