// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import {ZetaFlowUniversalApp} from "../src/ZetaFlowUniversalApp.sol";

contract SetGateway is Script {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address app = vm.envAddress("APP_ADDRESS");
        address gateway = vm.envAddress("GATEWAY_ZEVM");

        vm.startBroadcast(privateKey);
        ZetaFlowUniversalApp(app).setGateway(gateway);
        vm.stopBroadcast();

        console2.log("SetGateway done. App:", app);
        console2.log("Gateway:", gateway);
    }
}
