// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {Connected} from "../src/Connected.sol";

contract DeployConnected is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address gw = vm.envAddress("GATEWAY_EVM_SEPOLIA");

        vm.startBroadcast(pk);
        Connected c = new Connected(gw);
        vm.stopBroadcast();

        console2.log("Connected deployed:", address(c));
        console2.log("GatewayEVM:", gw);
    }
}
