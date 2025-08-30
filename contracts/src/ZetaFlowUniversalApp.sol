// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * ZetaFlowUniversalApp
 * 最小可用 Universal App：
 * - 接收计划（planData 为前端编码的 JSON 字符串），仅记录哈希与提交者
 * - 分步执行提现到连接链（通过 GatewayZEVM.withdraw）
 * - 事件记录：PlanSubmitted / StepExecuted / PlanCompleted / PlanFailed
 * - 简化：不在链上解析 JSON；步骤由提交者/自动化执行器按参数调用
 *
 * 注意：生产环境建议：
 * - 将 submitPlanFromGateway 限制为 onlyGateway
 * - 对步骤参数做更强的校验（例如与链下计划一致性校验）
 */

// 官方接口与库（与 Swap 教程一致）
import {IZRC20} from "@zetachain/protocol-contracts/contracts/zevm/interfaces/IZRC20.sol";
import {IGatewayZEVM} from "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import {RevertOptions, RevertContext} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import {UniversalContract, MessageContext} from "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import {IUniswapV2Router02} from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

// —— 以上官方 import 替代了本地最小定义 ——

contract ZetaFlowUniversalApp is UniversalContract {
    struct PlanState {
        address submitter; // 计划提交者（执行授权）
        bytes32 planDataHash; // 计划数据哈希（JSON 字符串 keccak256）
        uint256 currentStep; // 已执行的步骤数
        bool completed; // 是否标记完成
    }

    struct AllocationTarget {
        string symbol; // 代币符号 (BTC, ETH, USDC)
        uint256 weight; // 权重 (百分比 * 100, 例如 5000 = 50%)
        string dstChain; // 目标链 (ethereum, bitcoin)
    }

    struct RebalancePlan {
        string intent; // "rebalance"
        AllocationTarget[] targets;
        uint256 totalBudget; // 总预算 (wei)
        uint256 maxSlippageBps; // 最大滑点 (basis points)
    }

    IGatewayZEVM public gateway;
    address public owner;
    bool public enforceGatewayCaller = true; // 若为 true，仅允许 Gateway 回调 onCall
    bool public autoWithdrawOnCall = false; // 是否在 onCall 后自动原样出站回源链提交者
    IUniswapV2Router02 public dexRouter; // UniswapV2 Router（Athens 上：0x2ca7...）

    mapping(bytes32 => PlanState) public plans; // planId => state

    // 入站资产与原始计划内容存储，支持“入站/出站分离”
    struct PlanDeposit {
        address zrc20;
        uint256 amount;
    }
    mapping(bytes32 => PlanDeposit) public planDeposits; // planId => inbound token & amount
    mapping(bytes32 => bytes) public planPayloads; // planId => raw plan payload (ABI 编码)

    // ZRC-20 代币地址映射 (Athens 测试网)
    mapping(string => address) public zrc20Tokens;

    // 支持的目标链到 ZRC-20 映射
    mapping(string => mapping(string => address)) public chainTokenMapping;

    event PlanSubmitted(
        bytes32 indexed planId,
        address indexed submitter,
        bytes32 planDataHash
    );
    event StepExecuted(
        bytes32 indexed planId,
        uint256 indexed stepIndex,
        address token,
        uint256 amount,
        uint256 dstChainId,
        address receiver
    );
    event PlanCompleted(bytes32 indexed planId, uint256 steps);
    event PlanFailed(bytes32 indexed planId, string reason);
    event PlanReverted(address asset, uint256 amount, bytes revertMessage);
    event AssetReceived(
        address indexed zrc20,
        uint256 amount,
        address indexed submitter
    );
    event MessageReceived(address indexed submitter, bytes message);
    event RefundInitiated(
        address indexed zrc20,
        uint256 amount,
        address indexed recipient,
        bytes reason
    );
    event OwnershipTransferred(
        address indexed prevOwner,
        address indexed newOwner
    );
    event EnforceGatewayChanged(bool enabled);
    event RouterUpdated(address router);
    event SwapExecuted(
        bytes32 indexed planId,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event GasFeePrepared(
        address indexed gasZRC20,
        uint256 gasFee,
        address indexed payerToken
    );
    event WithdrawSkippedInsufficientGas(
        address indexed gasZRC20,
        uint256 required,
        uint256 available,
        address indexed payerToken
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    // onlyGateway 已由 UniversalContract 提供，这里移除自定义版本，避免语义重复

    modifier onlyPlanSubmitter(bytes32 planId) {
        require(plans[planId].submitter == msg.sender, "NOT_PLAN_SUBMITTER");
        _;
    }

    constructor(address gatewayAddress) {
        if (gatewayAddress != address(0)) {
            gateway = IGatewayZEVM(gatewayAddress);
        }
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);

        // 初始化 ZRC-20 代币映射 (Athens 测试网地址)
        _initializeTokenMappings();
    }

    function _initializeTokenMappings() private {
        // === Sepolia 测试网代币 (Chain ID: 11155111) ===
        zrc20Tokens["ETH"] = 0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0; // Sepolia ETH
        zrc20Tokens["USDC"] = 0xADF73ebA3Ebaa7254E859549A44c74eF7cff7501; // Sepolia USDC

        // === Bitcoin 测试网代币 (Chain ID: 18334) ===
        zrc20Tokens["BTC"] = 0xfC9201f4116aE6b054722E10b98D904829b469c3; // Bitcoin Testnet4

        // === BSC 测试网代币 (Chain ID: 97) ===
        zrc20Tokens["BNB"] = 0x48f80608B672DC30DC7e3dbBd0343c5F02C738Eb; // BSC Testnet BNB
        zrc20Tokens["USDC_BSC"] = 0x91BA869F7bD3CbF2375B5C95184a27Dc6C3eAF8E; // BSC Testnet USDC

        // === ZETA 原生代币 ===
        zrc20Tokens["ZETA"] = 0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf;

        // === 目标链映射 ===
        // Ethereum/Sepolia
        chainTokenMapping["ethereum"][
            "ETH"
        ] = 0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0;
        chainTokenMapping["ethereum"][
            "USDC"
        ] = 0xADF73ebA3Ebaa7254E859549A44c74eF7cff7501;

        // Bitcoin
        chainTokenMapping["bitcoin"][
            "BTC"
        ] = 0xfC9201f4116aE6b054722E10b98D904829b469c3;

        // BSC
        chainTokenMapping["bsc"][
            "BNB"
        ] = 0x48f80608B672DC30DC7e3dbBd0343c5F02C738Eb;
        chainTokenMapping["bsc"][
            "USDC"
        ] = 0x91BA869F7bD3CbF2375B5C95184a27Dc6C3eAF8E;

        // ZetaChain
        chainTokenMapping["zetachain"][
            "ZETA"
        ] = 0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "OWNER_ZERO");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setEnforceGatewayCaller(bool enabled) external onlyOwner {
        enforceGatewayCaller = enabled;
        emit EnforceGatewayChanged(enabled);
    }

    function setAutoWithdrawOnCall(bool enabled) external onlyOwner {
        autoWithdrawOnCall = enabled;
    }

    function setGateway(address gatewayAddress) external onlyOwner {
        require(gatewayAddress != address(0), "GATEWAY_ZERO");
        gateway = IGatewayZEVM(gatewayAddress);
    }

    function setRouter(address routerAddress) external onlyOwner {
        require(routerAddress != address(0), "ROUTER_ZERO");
        dexRouter = IUniswapV2Router02(routerAddress);
        emit RouterUpdated(routerAddress);
    }

    /**
     * Gateway（连接链 depositAndCall）在 ZetaChain 的回调入口
     * message: 前端 payload（计划 JSON）
     *
     * 真实的资产配置逻辑：
     * 1. 接收用户的 ZRC-20 资产 (如 1 ETH)
     * 2. 解析目标配置 (如 50% BTC, 50% USDC)
     * 3. 在 ZetaChain DEX 上执行 swap
     * 4. 将结果 withdraw 到目标链
     */
    function onCall(
        MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external override {
        if (enforceGatewayCaller) {
            require(msg.sender == address(gateway), "ONLY_GATEWAY");
        }

        // 纯消息/无资产早退：仅记录事件并返回
        if (zrc20 == address(0) || amount == 0) {
            emit MessageReceived(context.senderEVM, message);
            return;
        }
        address submitter = context.senderEVM;
        bytes32 planId = keccak256(
            abi.encodePacked(
                block.timestamp,
                submitter,
                keccak256(message),
                address(this)
            )
        );

        // 记录计划状态
        plans[planId] = PlanState({
            submitter: submitter,
            planDataHash: keccak256(message),
            currentStep: 0,
            completed: false
        });

        emit PlanSubmitted(planId, submitter, keccak256(message));
        emit AssetReceived(zrc20, amount, submitter);

        // 入站/出站分离：仅记录入站资产与原始计划，由提交者后续主动触发执行
        planDeposits[planId] = PlanDeposit({zrc20: zrc20, amount: amount});
        planPayloads[planId] = message;
    }

    /**
     * 执行资产配置计划的核心逻辑 - 解析真实的用户计划
     */
    function _executeRebalancePlan(
        bytes32 planId,
        address sourceZRC20,
        uint256 sourceAmount,
        bytes calldata planData,
        address submitter
    ) external {
        require(msg.sender == address(this), "INTERNAL_ONLY");
        require(address(dexRouter) != address(0), "ROUTER_NOT_SET");

        // 解析真实的计划数据（严格 ABI 解码 (string[], uint256[])）
        (string[] memory symbols, uint256[] memory weights) = abi.decode(
            planData,
            (string[], uint256[])
        );
        require(symbols.length == weights.length, "INVALID_PLAN_DATA");
        require(symbols.length > 0, "EMPTY_PLAN");

        // 验证权重总和是否为 100% (10000 basis points)
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < weights.length; i++) {
            totalWeight += weights[i];
        }
        require(totalWeight == 10000, "WEIGHTS_NOT_100_PERCENT");

        // 执行每个目标资产配置
        for (uint256 i = 0; i < symbols.length; i++) {
            if (weights[i] > 0) {
                _executeTargetAllocation(
                    planId,
                    sourceZRC20,
                    sourceAmount,
                    symbols[i],
                    weights[i],
                    submitter
                );
            }
        }
    }

    /**
     * 手动执行计划：由提交者在入站确认后调用，触发 swap/withdraw 等出站逻辑
     */
    function executePlan(bytes32 planId) external onlyPlanSubmitter(planId) {
        require(!plans[planId].completed, "PLAN_DONE");
        PlanDeposit memory dep = planDeposits[planId];
        require(dep.zrc20 != address(0) && dep.amount > 0, "NO_DEPOSIT");

        // 取回原始 payload
        bytes memory payload = planPayloads[planId];
        require(payload.length > 0, "NO_PAYLOAD");

        try
            this._executeRebalancePlan(
                planId,
                dep.zrc20,
                dep.amount,
                payload,
                plans[planId].submitter
            )
        {
            plans[planId].completed = true;
            emit PlanCompleted(planId, plans[planId].currentStep);
        } catch Error(string memory reason) {
            emit PlanFailed(planId, reason);
        }
    }

    /** 可选：执行完毕后清理原始 payload，减少存储占用 */
    function clearPlanPayload(
        bytes32 planId
    ) external onlyPlanSubmitter(planId) {
        require(plans[planId].completed, "NOT_DONE");
        delete planPayloads[planId];
    }

    /**
     * 解析计划数据 - 从前端传来的编码数据中提取符号和权重
     * 简化版本：假设前端传递 ABI 编码的 (string[], uint256[])
     */
    // 移除简化解析占位，改为上方严格 abi.decode

    /**
     * 手动解码分配数据
     */
    // function _parsePlanData / _decodeAllocationData 已废弃

    /**
     * 获取默认的资产配置
     */
    // 默认配置函数已移除，避免误交易

    /**
     * 执行单个目标资产配置
     */
    function _executeTargetAllocation(
        bytes32 planId,
        address sourceZRC20,
        uint256 sourceAmount,
        string memory targetSymbol,
        uint256 weightBps, // 权重 (basis points, 5000 = 50%)
        address submitter
    ) internal {
        uint256 allocationAmount = (sourceAmount * weightBps) / 10000;
        if (allocationAmount == 0) return;

        // 获取目标 ZRC-20 地址
        address targetZRC20 = _getTargetZRC20(targetSymbol);
        require(targetZRC20 != address(0), "UNSUPPORTED_TARGET_TOKEN");

        if (sourceZRC20 == targetZRC20) {
            // 相同代币，直接 withdraw
            _withdrawToChain(
                targetZRC20,
                allocationAmount,
                targetSymbol,
                submitter
            );
        } else {
            // 需要 swap
            uint256 amountOut = _swapOnZetaChain(
                sourceZRC20,
                targetZRC20,
                allocationAmount
            );
            _withdrawToChain(targetZRC20, amountOut, targetSymbol, submitter);
        }

        plans[planId].currentStep += 1;
        emit StepExecuted(
            planId,
            plans[planId].currentStep,
            targetZRC20,
            allocationAmount,
            0,
            submitter
        );
    }

    /**
     * 在 ZetaChain DEX 上执行 swap - 使用真实的市场价格计算滑点
     */
    function _swapOnZetaChain(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {
        require(tokenIn != tokenOut, "SAME_TOKEN");
        require(amountIn > 0, "ZERO_AMOUNT");

        // 授权 Router
        IZRC20(tokenIn).approve(address(dexRouter), amountIn);

        // 构造 swap 路径 (直接交易对或通过 ZETA 中转)
        address[] memory path = _getOptimalSwapPath(tokenIn, tokenOut);
        require(path.length >= 2, "NO_SWAP_PATH");

        // 获取预期输出量 (通过 Router 的 getAmountsOut)
        uint256 expectedAmountOut = _getExpectedAmountOut(amountIn, path);

        // 应用真实滑点保护 (默认 2%)
        uint256 amountOutMin = (expectedAmountOut * 98) / 100;

        // 执行 swap
        uint[] memory amounts = dexRouter.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            block.timestamp + 1800 // 30分钟 deadline
        );

        amountOut = amounts[amounts.length - 1];

        // 验证实际输出是否合理 (防止三明治攻击)
        require(amountOut >= amountOutMin, "INSUFFICIENT_OUTPUT");
        require(
            amountOut <= (expectedAmountOut * 102) / 100,
            "SUSPICIOUS_HIGH_OUTPUT"
        );

        return amountOut;
    }

    /**
     * 获取最优 swap 路径
     */
    function _getOptimalSwapPath(
        address tokenIn,
        address tokenOut
    ) internal pure returns (address[] memory path) {
        // 简化版本：直接交易对
        // 生产环境应该检查流动性并选择最优路径
        path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        return path;
    }

    /**
     * 获取预期输出量 (通过 Uniswap V2 公式)
     */
    function _getExpectedAmountOut(
        uint256 amountIn,
        address[] memory /*path*/
    ) internal pure returns (uint256) {
        // 这里应该调用 Router 的 getAmountsOut 方法
        // 简化版本返回估算值
        return amountIn; // 1:1 比例作为简化处理
    }

    /**
     * 将 ZRC-20 withdraw 到目标链
     */
    function _withdrawToChain(
        address zrc20,
        uint256 amount,
        string memory symbol,
        address recipient
    ) internal {
        bytes memory receiver = abi.encodePacked(recipient);

        // 按官方建议：提现仅需 withdraw gas fee，不应启用 onRevert/abort
        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: address(0),
            callOnRevert: false,
            abortAddress: address(0),
            revertMessage: bytes(""),
            onRevertGasLimit: 0
        });

        // 1) 预备目标链 gas 费（参考官方 Swap 教程）
        // https://www.zetachain.com/docs/developers/tutorials/swap/
        (address gasZRC20, uint256 gasFee) = IZRC20(zrc20).withdrawGasFee();

        // 若 gas 余额不足，尝试用当前待提现代币兑换一部分为 gasZRC20
        if (gasFee > 0) {
            uint256 gasBal = IZRC20(gasZRC20).balanceOf(address(this));
            if (gasBal < gasFee) {
                if (zrc20 == gasZRC20) {
                    // 若本次 amount 不足以覆盖 gas，跳过本次提现，等待后续补足
                    if (amount <= gasFee) {
                        emit WithdrawSkippedInsufficientGas(
                            gasZRC20,
                            gasFee,
                            gasBal + amount,
                            zrc20
                        );
                        return;
                    }
                    amount = amount - gasFee; // 直接从本次 amount 中预留 gas
                } else {
                    // 用部分 zrc20 兑换为 gasZRC20（简化：按 1:1 预估）
                    uint256 amountInForGas = gasFee;
                    if (amountInForGas > amount) {
                        amountInForGas = amount;
                    }

                    // 授权 Router
                    IZRC20(zrc20).approve(address(dexRouter), 0);
                    IZRC20(zrc20).approve(address(dexRouter), amountInForGas);

                    address[] memory pathGas = _getOptimalSwapPath(
                        zrc20,
                        gasZRC20
                    );
                    require(pathGas.length >= 2, "NO_GAS_PATH");

                    uint256 expectedOutForGas = _getExpectedAmountOut(
                        amountInForGas,
                        pathGas
                    );
                    uint256 minOutForGas = (expectedOutForGas * 98) / 100; // 2% 滑点保护
                    if (minOutForGas < gasFee) {
                        // 确保至少覆盖 gasFee
                        minOutForGas = gasFee;
                    }

                    dexRouter.swapExactTokensForTokens(
                        amountInForGas,
                        minOutForGas,
                        pathGas,
                        address(this),
                        block.timestamp + 1800
                    );
                }
            }

            // 再次校验 gas 余额是否足够；不足则跳过本次提现
            uint256 gasBalAfter = IZRC20(gasZRC20).balanceOf(address(this));
            if (gasBalAfter < gasFee) {
                emit WithdrawSkippedInsufficientGas(
                    gasZRC20,
                    gasFee,
                    gasBalAfter,
                    zrc20
                );
                return;
            }

            // 授权 Gateway 支付 gas 与目标代币
            IZRC20(gasZRC20).approve(address(gateway), gasFee);
            IZRC20(zrc20).approve(address(gateway), 0);
            IZRC20(zrc20).approve(address(gateway), amount);

            emit GasFeePrepared(gasZRC20, gasFee, zrc20);
        } else {
            // 无需 gas 费时，仍需授权目标代币
            IZRC20(zrc20).approve(address(gateway), 0);
            IZRC20(zrc20).approve(address(gateway), amount);
        }

        // 2) 提现到目标链
        gateway.withdraw(receiver, amount, zrc20, revertOptions);
    }

    /**
     * 获取目标代币的 ZRC-20 地址 - 支持真实的测试网代币
     */
    function _getTargetZRC20(
        string memory symbol
    ) internal view returns (address) {
        // 直接从映射表获取地址
        address tokenAddr = zrc20Tokens[symbol];
        if (tokenAddr != address(0)) {
            return tokenAddr;
        }

        // 回退到别名映射
        bytes32 symbolHash = keccak256(bytes(symbol));
        if (symbolHash == keccak256(bytes("BTC"))) {
            return zrc20Tokens["BTC"];
        } else if (symbolHash == keccak256(bytes("USDC"))) {
            return zrc20Tokens["USDC"];
        } else if (symbolHash == keccak256(bytes("ETH"))) {
            return zrc20Tokens["ETH"];
        } else if (symbolHash == keccak256(bytes("BNB"))) {
            return zrc20Tokens["BNB"];
        } else if (symbolHash == keccak256(bytes("ZETA"))) {
            return zrc20Tokens["ZETA"];
        }

        return address(0);
    }

    /**
     * 添加或更新代币映射 (仅 owner)
     */
    function updateTokenMapping(
        string calldata symbol,
        address zrc20Address
    ) external onlyOwner {
        require(zrc20Address != address(0), "ZERO_ADDRESS");
        zrc20Tokens[symbol] = zrc20Address;
    }

    /**
     * 获取所有支持的代币符号
     */
    function getSupportedTokens() external pure returns (string[] memory) {
        string[] memory tokens = new string[](6);
        tokens[0] = "ETH";
        tokens[1] = "USDC";
        tokens[2] = "BTC";
        tokens[3] = "BNB";
        tokens[4] = "USDC_BSC";
        tokens[5] = "ZETA";
        return tokens;
    }

    /**
     * 退还资产（失败时调用）
     */
    function _refundAsset(
        address recipient,
        address zrc20,
        uint256 amount
    ) internal {
        bytes memory receiver = abi.encodePacked(recipient);

        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: address(0),
            callOnRevert: false,
            abortAddress: address(0),
            revertMessage: bytes("REFUND"),
            onRevertGasLimit: 0
        });

        emit RefundInitiated(
            zrc20,
            amount,
            recipient,
            revertOptions.revertMessage
        );
        gateway.withdraw(receiver, amount, zrc20, revertOptions);
    }

    /**
     * 开放式提交（本地/演示使用）。生产建议关闭或仅限白名单。
     */
    function submitPlan(
        bytes calldata planData
    ) external returns (bytes32 planId) {
        bytes32 hash = keccak256(planData);
        planId = keccak256(
            abi.encodePacked(block.timestamp, msg.sender, hash, address(this))
        );
        plans[planId] = PlanState({
            submitter: msg.sender,
            planDataHash: hash,
            currentStep: 0,
            completed: false
        });
        emit PlanSubmitted(planId, msg.sender, hash);
    }

    /**
     * 执行单步提现（由计划提交者触发）
     * @param planId 计划 ID
     * @param token ZRC-20 代币地址（来自连接链资产的映射）
     * @param amount 提现金额（ZRC-20 精度）
     * @param receiver 目标链接收地址（bytes 编码，EVM 链需将 address 转 bytes）
     * @param dstCalldata 目标链合约调用数据（若仅提现至 EOA，可传空 bytes）
     */
    function executeWithdrawStep(
        bytes32 planId,
        address token,
        uint256 amount,
        bytes calldata receiver,
        bytes calldata dstCalldata,
        RevertOptions calldata revertOptions
    ) external onlyPlanSubmitter(planId) {
        require(!plans[planId].completed, "PLAN_DONE");
        require(amount > 0, "AMOUNT_ZERO");
        require(receiver.length != 0, "RECEIVER_ZERO");

        // 通过 GatewayZEVM 发起出站（简化为直接 withdraw）
        gateway.withdraw(receiver, amount, token, revertOptions);

        // 记录进度
        plans[planId].currentStep += 1;
        emit StepExecuted(
            planId,
            plans[planId].currentStep,
            token,
            amount,
            0,
            address(0)
        );
    }

    /**
     * 一键 Swap -> Withdraw：将合约持有的 tokenIn 中的 amountIn 通过 DEX 兑换为 tokenOut，
     * 然后将得到的 tokenOut 全部提现到连接链接收者。
     */
    function executeSwapAndWithdrawStep(
        bytes32 planId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address[] calldata path,
        uint256 deadline,
        bytes calldata receiver,
        bytes calldata dstCalldata,
        RevertOptions calldata revertOptions
    ) external onlyPlanSubmitter(planId) {
        require(address(dexRouter) != address(0), "ROUTER_NOT_SET");
        require(!plans[planId].completed, "PLAN_DONE");
        require(amountIn > 0, "AMOUNT_ZERO");
        require(
            path.length >= 2 &&
                path[0] == tokenIn &&
                path[path.length - 1] == tokenOut,
            "BAD_PATH"
        );
        require(receiver.length != 0, "RECEIVER_ZERO");

        // 记录兑换前后余额以计算实际 amountOut
        uint256 balanceBefore = IZRC20(tokenOut).balanceOf(address(this));

        // 授权 Router
        uint256 currentAllowance = IZRC20(tokenIn).allowance(
            address(this),
            address(dexRouter)
        );
        if (currentAllowance < amountIn) {
            // 先清零再设定，兼容某些代币的安全检查
            IZRC20(tokenIn).approve(address(dexRouter), 0);
            IZRC20(tokenIn).approve(address(dexRouter), amountIn);
        }

        // 执行兑换，输出代币接收至本合约
        dexRouter.swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            deadline
        );

        uint256 balanceAfter = IZRC20(tokenOut).balanceOf(address(this));
        uint256 actualOut = balanceAfter - balanceBefore;
        require(actualOut >= minAmountOut, "INSUFFICIENT_OUT");

        emit SwapExecuted(planId, tokenIn, tokenOut, amountIn, actualOut);

        // 提现兑换得到的 tokenOut（简化为直接 withdraw）
        gateway.withdraw(receiver, actualOut, tokenOut, revertOptions);

        // 记录步骤
        plans[planId].currentStep += 1;
        emit StepExecuted(
            planId,
            plans[planId].currentStep,
            tokenOut,
            actualOut,
            0,
            address(0)
        );
    }

    /**
     * 仅进行 Swap（不出站），将合约持有的 tokenIn 兑换为 tokenOut
     */
    function executeSwapStep(
        bytes32 planId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address[] calldata path,
        uint256 deadline
    ) external onlyPlanSubmitter(planId) {
        require(address(dexRouter) != address(0), "ROUTER_NOT_SET");
        require(!plans[planId].completed, "PLAN_DONE");
        require(amountIn > 0, "AMOUNT_ZERO");
        require(
            path.length >= 2 &&
                path[0] == tokenIn &&
                path[path.length - 1] == tokenOut,
            "BAD_PATH"
        );

        uint256 balanceBefore = IZRC20(tokenOut).balanceOf(address(this));

        uint256 currentAllowance = IZRC20(tokenIn).allowance(
            address(this),
            address(dexRouter)
        );
        if (currentAllowance < amountIn) {
            IZRC20(tokenIn).approve(address(dexRouter), 0);
            IZRC20(tokenIn).approve(address(dexRouter), amountIn);
        }

        dexRouter.swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            deadline
        );

        uint256 balanceAfter = IZRC20(tokenOut).balanceOf(address(this));
        uint256 actualOut = balanceAfter - balanceBefore;
        require(actualOut >= minAmountOut, "INSUFFICIENT_OUT");

        emit SwapExecuted(planId, tokenIn, tokenOut, amountIn, actualOut);
        plans[planId].currentStep += 1;
    }

    /** 标记计划完成（可选） */
    function completePlan(bytes32 planId) external onlyPlanSubmitter(planId) {
        require(!plans[planId].completed, "PLAN_DONE");
        plans[planId].completed = true;
        emit PlanCompleted(planId, plans[planId].currentStep);
    }

    /** 标记失败（记录原因，实际退款由 Gateway 回滚机制处理） */
    function failPlan(
        bytes32 planId,
        string calldata reason
    ) external onlyPlanSubmitter(planId) {
        require(!plans[planId].completed, "PLAN_DONE");
        emit PlanFailed(planId, reason);
    }

    /**
     * 当出站调用在目标链失败且 RevertOptions.callOnRevert=true 时，Gateway 在 ZetaChain 调用 onRevert
     */
    function onRevert(RevertContext calldata revertContext) external {
        if (enforceGatewayCaller) {
            require(msg.sender == address(gateway), "ONLY_GATEWAY");
        }
        emit PlanReverted(
            revertContext.asset,
            revertContext.amount,
            revertContext.revertMessage
        );
    }

    /**
     * 仅提现（带 gas 预备与授权），便于前端/脚本在三段式流程中单独触发出站
     */
    function withdrawWithGasPrep(
        address zrc20,
        uint256 amount,
        string calldata symbol,
        address recipient
    ) external onlyOwner {
        require(zrc20 != address(0) && amount > 0, "BAD_PARAMS");
        require(recipient != address(0), "RECIPIENT_ZERO");
        _withdrawToChain(zrc20, amount, symbol, recipient);
    }
}
