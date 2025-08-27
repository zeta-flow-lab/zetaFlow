/**
 * 智能合约地址配置
 * 基于 ZetaChain Gateway 文档和测试网部署信息
 */

export interface ContractAddresses {
    gateway: string;
    custody?: string;
    universalApp?: string;
}

export interface TokenAddresses {
    [symbol: string]: string;
}

// 备注：浏览器环境下不再引入 @zetachain/toolkit，以避免 Vite 依赖解析问题。
// 地址解析统一使用本地映射或从外部 JSON（预处理）注入。

// ZetaChain Athens 测试网合约地址
export const ZETACHAIN_ATHENS_ADDRESSES: ContractAddresses = {
    gateway: '0x6c533f7fe93fae114d0954697069df33c9b74fd7', // Gateway (ZEVM) on Athens testnet
    universalApp: '0xea88458beCA36881C91B8fd8Ad42ce1d776dD685', // 新部署的增强版 Universal App (Athens)
};

// Ethereum Sepolia 测试网合约地址
export const SEPOLIA_ADDRESSES: ContractAddresses = {
    gateway: '0x0c487a766110c85d301d96e33579c5b317fa4995', // GatewayEVM Sepolia (testnet)
    custody: '0x0000000000000000000000000000000000000000', // ERC20Custody Sepolia
};

// BSC 测试网合约地址
export const BSC_TESTNET_ADDRESSES: ContractAddresses = {
    gateway: '0x0c487a766110c85d301d96e33579c5b317fa4995', // GatewayEVM BSC Testnet
    custody: '0x0000000000000000000000000000000000000000', // ERC20Custody BSC Testnet
};

// 按链 ID 映射的合约地址
export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
    7001: ZETACHAIN_ATHENS_ADDRESSES, // ZetaChain Athens
    11155111: SEPOLIA_ADDRESSES,      // Ethereum Sepolia
    97: BSC_TESTNET_ADDRESSES,        // BSC Testnet
    80002: { // Polygon Amoy
        gateway: '0x0c487a766110c85d301d96e33579c5b317fa4995',
    },
    84532: { // Base Sepolia
        gateway: '0x0c487a766110c85d301d96e33579c5b317fa4995',
    },
    421614: { // Arbitrum Sepolia
        gateway: '0x0dA86Dc3F9B71F84a0E97B0e2291e50B7a5df10f',
    },
    43113: { // Avalanche Fuji
        gateway: '0x0dA86Dc3F9B71F84a0E97B0e2291e50B7a5df10f',
    },
};

// ZetaChain Athens 测试网代币地址 (ZRC-20)
export const ZETACHAIN_ATHENS_TOKENS: TokenAddresses = {
    // 参考 contracts/addresses.testnet.json
    // sETH（来自 Sepolia ETH）
    'ETH': '0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0', // sETH.SEPOLIA
    // Sepolia USDC 对应的 ZRC-20
    'USDC': '0xcC683A782f4B30c138787CB5576a86AF66fdc31d', // USDC.SEPOLIA
    // sBTC（Bitcoin Signet）
    'BTC': '0xdbfF6471a79E5374d771922F2194eccc42210B9F', // sBTC.BTC
    // BSC Testnet USDC（如需）
    'USDC.BSC': '0x7c8dDa80bbBE1254a7aACf3219EBe1481c6E01d7',
    // ZETA（非 ZRC-20，保留占位，避免误用）
    'ZETA': '0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf',
};

// Ethereum Sepolia 测试网代币地址
export const SEPOLIA_TOKENS: TokenAddresses = {
    'USDC': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC Sepolia
    'USDT': '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // USDT Sepolia
    'WETH': '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // WETH Sepolia
    'ZETA': '0x0000000000000000000000000000000000000000', // ZETA on Sepolia
};

// BSC 测试网代币地址
export const BSC_TESTNET_TOKENS: TokenAddresses = {
    'USDC': '0x64544969ed7EBf5f083679233325356EbE738930', // USDC BSC Testnet
    'USDT': '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd', // USDT BSC Testnet
    'WBNB': '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // WBNB BSC Testnet
    'ZETA': '0x0000000000000000000000000000000000000000', // ZETA on BSC Testnet
};

// 按链 ID 映射的代币地址
export const TOKEN_ADDRESSES: Record<number, TokenAddresses> = {
    7001: ZETACHAIN_ATHENS_TOKENS,    // ZetaChain Athens
    11155111: SEPOLIA_TOKENS,         // Ethereum Sepolia
    97: BSC_TESTNET_TOKENS,           // BSC Testnet
};

// 获取指定链的合约地址
export function getContractAddresses(chainId: number): ContractAddresses | undefined {
    return CONTRACT_ADDRESSES[chainId];
}

// 获取指定链的代币地址
export function getTokenAddresses(chainId: number): TokenAddresses | undefined {
    return TOKEN_ADDRESSES[chainId];
}

// 获取 Gateway 地址
export function getGatewayAddress(chainId: number): string | undefined {
    // 允许通过 .env 覆盖，例如 VITE_GATEWAY_7001
    const envKey = `VITE_GATEWAY_${chainId}`;
    const envVal = (import.meta as any)?.env?.[envKey] as string | undefined;
    if (envVal && /^0x[a-fA-F0-9]{40}$/.test(envVal)) return envVal;
    return CONTRACT_ADDRESSES[chainId]?.gateway;
}

// 获取 Universal App 地址
export function getUniversalAppAddress(chainId: number): string | undefined {
    // 允许通过 .env 覆盖，例如 VITE_UNIVERSAL_APP_7001
    const envKey = `VITE_UNIVERSAL_APP_${chainId}`;
    const envVal = (import.meta as any)?.env?.[envKey] as string | undefined;
    if (envVal && /^0x[a-fA-F0-9]{40}$/.test(envVal)) return envVal;
    return CONTRACT_ADDRESSES[chainId]?.universalApp;
}

// 获取指定代币在指定链上的地址
export function getTokenAddress(chainId: number, symbol: string): string | undefined {
    return TOKEN_ADDRESSES[chainId]?.[symbol.toUpperCase()];
}

// 检查是否为原生代币
export function isNativeToken(chainId: number, symbol: string): boolean {
    const normalizedSymbol = symbol.toUpperCase();

    switch (chainId) {
        case 7001: // ZetaChain Athens
        case 7000: // ZetaChain Mainnet
            return normalizedSymbol === 'ZETA';
        case 11155111: // Ethereum Sepolia
        case 1: // Ethereum Mainnet
            return normalizedSymbol === 'ETH';
        case 97: // BSC Testnet
        case 56: // BSC Mainnet
            return normalizedSymbol === 'BNB';
        default:
            return false;
    }
}

// 获取链的原生代币符号
export function getNativeTokenSymbol(chainId: number): string {
    switch (chainId) {
        case 7001:
        case 7000:
            return 'ZETA';
        case 11155111:
        case 1:
            return 'ETH';
        case 97:
        case 56:
            return 'BNB';
        default:
            return 'UNKNOWN';
    }
}

// 更新合约地址（用于部署后更新）
export function updateContractAddress(
    chainId: number,
    contractType: keyof ContractAddresses,
    address: string
): void {
    if (!CONTRACT_ADDRESSES[chainId]) {
        CONTRACT_ADDRESSES[chainId] = { gateway: '' };
    }
    CONTRACT_ADDRESSES[chainId][contractType] = address;
}

// 验证地址格式
export function isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// 常用合约 ABI 片段
export const GATEWAY_ABI_FRAGMENTS = [
    // EVM connected chains
    'function deposit(address receiver, (address revertAddress,bool callOnRevert,address abortAddress,bytes revertMessage,uint256 onRevertGasLimit) revertOptions) external payable',
    'function deposit(address receiver, uint256 amount, address asset, (address revertAddress,bool callOnRevert,address abortAddress,bytes revertMessage,uint256 onRevertGasLimit) revertOptions) external',
    'function depositAndCall(address receiver, bytes payload, (address revertAddress,bool callOnRevert,address abortAddress,bytes revertMessage,uint256 onRevertGasLimit) revertOptions) external payable',
    'function depositAndCall(address receiver, uint256 amount, address asset, bytes payload, (address revertAddress,bool callOnRevert,address abortAddress,bytes revertMessage,uint256 onRevertGasLimit) revertOptions) external',
    'function call(address receiver, bytes payload, (address revertAddress,bool callOnRevert,address abortAddress,bytes revertMessage,uint256 onRevertGasLimit) revertOptions) external',
    // ZetaChain side
    'function withdraw(bytes receiver, uint256 amount, address zrc20, (address revertAddress,bool callOnRevert,address abortAddress,bytes revertMessage,uint256 onRevertGasLimit) revertOptions) external',
    'function withdrawAndCall(bytes receiver, uint256 amount, address zrc20, bytes message, bytes callOptions, (address revertAddress,bool callOnRevert,address abortAddress,bytes revertMessage,uint256 onRevertGasLimit) revertOptions) external',
    // Events (names may differ; keep watch flexible in watchers)
    'event Deposited(address indexed sender, address indexed receiver, uint256 amount, bytes payload)',
    'event Withdrawn(address indexed zrc20, bytes indexed receiver, uint256 amount)'
] as const;

export const ERC20_ABI_FRAGMENTS = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function balanceOf(address account) external view returns (uint256)',
    'function transfer(address to, uint256 amount) external returns (bool)',
    'function decimals() external view returns (uint8)',
    'function symbol() external view returns (string)',
    'function name() external view returns (string)',
] as const;


