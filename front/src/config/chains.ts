/**
 * 区块链网络配置
 * 基于 ZetaChain 官方文档和测试网信息
 */

export interface ChainConfig {
    id: number;
    name: string;
    network: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpcUrls: {
        default: { http: string[] };
        public: { http: string[] };
    };
    blockExplorers: {
        default: { name: string; url: string };
    };
    testnet?: boolean;
    gatewayAddress?: string;
}

// ZetaChain 测试网配置
export const zetachainAthens: ChainConfig = {
    id: 7001,
    name: 'ZetaChain Athens',
    network: 'zetachain-testnet',
    nativeCurrency: {
        name: 'Zeta',
        symbol: 'ZETA',
        decimals: 18,
    },
    rpcUrls: {
        default: { http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'] },
        public: { http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'] },
    },
    blockExplorers: {
        default: { name: 'ZetaChain Explorer', url: 'https://athens.explorer.zetachain.com' },
    },
    testnet: true,
    gatewayAddress: '0x0000c9EC4042283e8139c74f4c64bDD4f84420b0', // Athens testnet Gateway
};

// ZetaChain 主网配置
export const zetachain: ChainConfig = {
    id: 7000,
    name: 'ZetaChain',
    network: 'zetachain',
    nativeCurrency: {
        name: 'Zeta',
        symbol: 'ZETA',
        decimals: 18,
    },
    rpcUrls: {
        default: { http: ['https://zetachain-evm.blockpi.network/v1/rpc/public'] },
        public: { http: ['https://zetachain-evm.blockpi.network/v1/rpc/public'] },
    },
    blockExplorers: {
        default: { name: 'ZetaChain Explorer', url: 'https://explorer.zetachain.com' },
    },
    testnet: false,
    gatewayAddress: '0x0000c9EC4042283e8139c74f4c64bDD4f84420b0', // 待更新为主网地址
};

// Ethereum Sepolia 测试网
export const sepolia: ChainConfig = {
    id: 11155111,
    name: 'Sepolia',
    network: 'sepolia',
    nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    rpcUrls: {
        default: { http: ['https://rpc.sepolia.org'] },
        public: { http: ['https://rpc.sepolia.org'] },
    },
    blockExplorers: {
        default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
    },
    testnet: true,
    gatewayAddress: '0x0000c9EC4042283e8139c74f4c64bDD4f84420b0', // 待更新为实际地址
};

// BSC 测试网
export const bscTestnet: ChainConfig = {
    id: 97,
    name: 'BNB Smart Chain Testnet',
    network: 'bsc-testnet',
    nativeCurrency: {
        name: 'Binance Coin',
        symbol: 'BNB',
        decimals: 18,
    },
    rpcUrls: {
        default: { http: ['https://data-seed-prebsc-1-s1.bnbchain.org:8545'] },
        public: { http: ['https://data-seed-prebsc-1-s1.bnbchain.org:8545'] },
    },
    blockExplorers: {
        default: { name: 'BscScan', url: 'https://testnet.bscscan.com' },
    },
    testnet: true,
    gatewayAddress: '0x0000c9EC4042283e8139c74f4c64bDD4f84420b0', // 待更新为实际地址
};

// Polygon Amoy Testnet
export const polygonAmoy: ChainConfig = {
    id: 80002,
    name: 'Polygon Amoy',
    network: 'polygon-amoy',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc-amoy.polygon.technology'] },
        public: { http: ['https://rpc-amoy.polygon.technology'] },
    },
    blockExplorers: {
        default: { name: 'Polygonscan', url: 'https://www.oklink.com/amoy' },
    },
    testnet: true,
};

// Arbitrum Sepolia
export const arbitrumSepolia: ChainConfig = {
    id: 421614,
    name: 'Arbitrum Sepolia',
    network: 'arbitrum-sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://sepolia-rollup.arbitrum.io/rpc'] },
        public: { http: ['https://sepolia-rollup.arbitrum.io/rpc'] },
    },
    blockExplorers: {
        default: { name: 'Arbiscan', url: 'https://sepolia.arbiscan.io' },
    },
    testnet: true,
};

// Optimism Sepolia
export const optimismSepolia: ChainConfig = {
    id: 11155420,
    name: 'OP Sepolia',
    network: 'optimism-sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://sepolia.optimism.io'] },
        public: { http: ['https://sepolia.optimism.io'] },
    },
    blockExplorers: {
        default: { name: 'OP Explorer', url: 'https://sepolia-optimism.etherscan.io' },
    },
    testnet: true,
};

// Base Sepolia
export const baseSepolia: ChainConfig = {
    id: 84532,
    name: 'Base Sepolia',
    network: 'base-sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://sepolia.base.org'] },
        public: { http: ['https://sepolia.base.org'] },
    },
    blockExplorers: {
        default: { name: 'Basescan', url: 'https://sepolia.basescan.org' },
    },
    testnet: true,
};

// 支持的区块链列表
export const SUPPORTED_CHAINS = [
    zetachainAthens, // 优先使用测试网
    sepolia,
    bscTestnet,
    polygonAmoy,
    arbitrumSepolia,
    optimismSepolia,
    baseSepolia,
    // zetachain, // 主网暂时注释
] as const;

// 链 ID 映射
export const CHAIN_MAP = SUPPORTED_CHAINS.reduce((acc, chain) => {
    acc[chain.id] = chain;
    return acc;
}, {} as Record<number, ChainConfig>);

// 根据链 ID 获取链配置
export function getChainConfig(chainId: number): ChainConfig | undefined {
    return CHAIN_MAP[chainId];
}

// 检查是否为支持的链
export function isSupportedChain(chainId: number): boolean {
    return chainId in CHAIN_MAP;
}

// 获取默认链（ZetaChain Athens 测试网）
export function getDefaultChain(): ChainConfig {
    return zetachainAthens;
}

// 根据网络名称获取链配置
export function getChainByNetwork(network: string): ChainConfig | undefined {
    return SUPPORTED_CHAINS.find(chain => chain.network === network);
}

// 检查是否为测试网
export function isTestnet(chainId: number): boolean {
    const chain = getChainConfig(chainId);
    return chain?.testnet || false;
}


