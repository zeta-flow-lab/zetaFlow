// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import {ZetaFlowUniversalApp} from "../src/ZetaFlowUniversalApp.sol";

/**
 * 部署脚本
 * 用法：
 *  1) 在 shell 中导出 PRIVATE_KEY 与 GATEWAY_ZEVM
 *     export PRIVATE_KEY=0x...
 *     export GATEWAY_ZEVM=0x...  # Athens 测试网 GatewayZEVM 地址
 *  2) 运行（本地 dry-run）：
 *     forge script script/Deploy.s.sol --rpc-url $ZETA_RPC
 *  3) 广播部署：
 *     forge script script/Deploy.s.sol --rpc-url $ZETA_RPC --broadcast --verify --verifier blockscout
 */
contract Deploy is Script {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address gateway = vm.envAddress("GATEWAY_ZEVM");

        vm.startBroadcast(privateKey);
        ZetaFlowUniversalApp app = new ZetaFlowUniversalApp(gateway);
        vm.stopBroadcast();

        console2.log("ZetaFlowUniversalApp deployed:", address(app));
        console2.log("GatewayZEVM:", gateway);
    }
}
