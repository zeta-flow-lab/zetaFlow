// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {ZetaFlowUniversalApp} from "../src/ZetaFlowUniversalApp.sol";

contract SetRouter is Script {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address app = vm.envAddress("APP_ADDRESS");
        address router = vm.envAddress("ROUTER_ADDRESS");

        vm.startBroadcast(privateKey);
        ZetaFlowUniversalApp(app).setRouter(router);
        vm.stopBroadcast();

        console2.log("SetRouter done. App:", app);
        console2.log("Router:", router);
    }
}
