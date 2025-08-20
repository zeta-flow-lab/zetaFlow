// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

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

// 对齐官方文档最小接口与结构体
struct MessageContext {
    address sender;
    uint256 chainID;
}
struct RevertOptions {
    address revertAddress;
    bool callOnRevert;
    address abortAddress;
    bytes revertMessage;
    uint256 onRevertGasLimit;
}
struct RevertContext {
    address asset;
    uint64 amount;
    bytes revertMessage;
}

interface IGatewayZEVM {
    function withdraw(
        bytes memory receiver,
        uint256 amount,
        address zrc20,
        RevertOptions calldata revertOptions
    ) external;

    function withdrawAndCall(
        bytes memory receiver,
        uint256 amount,
        address zrc20,
        bytes calldata message,
        bytes calldata callOptions,
        RevertOptions calldata revertOptions
    ) external;
}

contract ZetaFlowUniversalApp {
    struct PlanState {
        address submitter; // 计划提交者（执行授权）
        bytes32 planDataHash; // 计划数据哈希（JSON 字符串 keccak256）
        uint256 currentStep; // 已执行的步骤数
        bool completed; // 是否标记完成
    }

    IGatewayZEVM public gateway;
    address public owner;
    bool public enforceGatewayCaller = true; // 若为 true，仅允许 Gateway 回调 onCall
    bool public autoWithdrawOnCall = false; // 是否在 onCall 后自动原样出站回源链提交者

    mapping(bytes32 => PlanState) public plans; // planId => state

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
    event PlanReverted(address asset, uint64 amount, bytes revertMessage);
    event OwnershipTransferred(
        address indexed prevOwner,
        address indexed newOwner
    );
    event EnforceGatewayChanged(bool enabled);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyGateway() {
        require(msg.sender == address(gateway), "NOT_GATEWAY");
        _;
    }

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

    /**
     * Gateway（连接链 depositAndCall）在 ZetaChain 的回调入口
     * message: 前端 payload（计划 JSON）
     */
    function onCall(
        MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external {
        if (enforceGatewayCaller) {
            require(msg.sender == address(gateway), "ONLY_GATEWAY");
        }
        address submitter = context.sender; // 使用连接链发起者作为计划提交者
        bytes32 hash = keccak256(message);
        bytes32 planId = keccak256(
            abi.encodePacked(block.timestamp, submitter, hash, address(this))
        );
        plans[planId] = PlanState({
            submitter: submitter,
            planDataHash: hash,
            currentStep: 0,
            completed: false
        });
        emit PlanSubmitted(planId, submitter, hash);

        // 最小自动出站：将收到的 ZRC-20 按原样提现回源链提交者
        if (autoWithdrawOnCall && amount > 0 && zrc20 != address(0)) {
            // 将 EVM 地址编码为 bytes（20 字节）作为 receiver
            bytes memory receiver = abi.encodePacked(submitter);
            // 组装最小回滚选项（不触发 onRevert）
            RevertOptions memory opts = RevertOptions({
                revertAddress: address(0),
                callOnRevert: false,
                abortAddress: address(0),
                revertMessage: bytes(""),
                onRevertGasLimit: 0
            });
            // 直接提现回源链（由 zrc20 所映射的底层链决定）
            gateway.withdraw(receiver, amount, zrc20, opts);
        }
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

        // 通过 GatewayZEVM 发起出站
        if (dstCalldata.length > 0) {
            gateway.withdrawAndCall(
                receiver,
                amount,
                token,
                dstCalldata,
                bytes(""),
                revertOptions
            );
        } else {
            gateway.withdraw(receiver, amount, token, revertOptions);
        }

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
}
