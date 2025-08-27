// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/ZetaFlowUniversalApp.sol";
import {IZRC20} from "@zetachain/protocol-contracts/contracts/zevm/interfaces/IZRC20.sol";

/**
 * 手动测试脚本 - 直接在 ZetaChain 上测试 Universal App 逻辑
 * 无需等待跨链消息，直接模拟 onCall 调用
 */
contract ManualTest is Script {
    ZetaFlowUniversalApp app =
        ZetaFlowUniversalApp(0xea88458beCA36881C91B8fd8Ad42ce1d776dD685);

    // ZRC-20 代币地址
    address constant ETH_ZRC20 = 0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0;
    address constant USDC_ZRC20 = 0xADF73ebA3Ebaa7254E859549A44c74eF7cff7501;
    address constant BTC_ZRC20 = 0xfC9201f4116aE6b054722E10b98D904829b469c3;
    address constant ZETA_ZRC20 = 0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf;

    function run() external {
        vm.startBroadcast();

        console.log("=== Manual Test: Direct onCall Simulation ===");

        // 模拟前端生成的配置数据 (50% BTC, 30% USDC, 20% ZETA)
        string[] memory symbols = new string[](3);
        symbols[0] = "BTC";
        symbols[1] = "USDC";
        symbols[2] = "ZETA";

        uint256[] memory weights = new uint256[](3);
        weights[0] = 5000; // 50%
        weights[1] = 3000; // 30%
        weights[2] = 2000; // 20%

        bytes memory planData = abi.encode(symbols, weights);

        // 直接使用 submitter 地址（不再手工构造 MessageContext）
        address submitter = 0x761dA2171D1F49e1e6Ad796d696Ec0e4fA25259e;
        console.log("Test User:", submitter);
        console.log("Plan Data Length:", planData.length);
        console.log("Target Allocations:");
        for (uint i = 0; i < symbols.length; i++) {
            console.log(
                string.concat(
                    symbols[i],
                    ": ",
                    vm.toString(weights[i] / 100),
                    "%"
                )
            );
        }

        // 检查合约当前状态
        console.log("\n=== Before Test ===");
        checkBalance("ETH", ETH_ZRC20);
        checkBalance("USDC", USDC_ZRC20);
        checkBalance("BTC", BTC_ZRC20);
        checkBalance("ZETA", ZETA_ZRC20);

        // 方案1: 如果合约有余额，直接调用 onCall
        uint256 ethBalance = IZRC20(ETH_ZRC20).balanceOf(address(app));
        if (ethBalance > 0) {
            console.log("\n=== Testing with existing balance ===");
            try
                app.onCall(
                    MessageContext({
                        sender: abi.encodePacked(submitter),
                        senderEVM: submitter,
                        chainID: 11155111
                    }),
                    ETH_ZRC20,
                    ethBalance,
                    planData
                )
            {
                console.log("onCall execution successful!");
            } catch Error(string memory reason) {
                console.log("onCall failed:", reason);
            }
        } else {
            console.log(
                "\n=== No balance found - Need to fund contract first ==="
            );
            console.log("Options:");
            console.log("1. Wait for cross-chain message to arrive");
            console.log(
                "2. Manually send some ZRC-20 tokens to the contract for testing"
            );
            console.log(
                "3. Use the outbound test page to simulate individual steps"
            );
        }

        vm.stopBroadcast();
    }

    function checkBalance(string memory symbol, address token) internal view {
        uint256 balance = IZRC20(token).balanceOf(address(app));
        console.log(string.concat(symbol, " balance: "), balance);
    }
}
// IERC20 already declared in imported contract; avoid redeclaration here.
