/**
 * 钱包连接与管理模块
 * 基于 wagmi + viem 实现多链钱包集成
 */

import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { SUPPORTED_CHAINS, type ChainConfig } from '../config/chains';

// 将我们的链配置转换为 wagmi 格式
export const wagmiChains = SUPPORTED_CHAINS.map((chain: ChainConfig) => ({
    id: chain.id,
    name: chain.name,
    network: chain.network,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: {
        default: { http: chain.rpcUrls.default.http },
        public: { http: chain.rpcUrls.public.http },
    },
    blockExplorers: {
        default: chain.blockExplorers.default,
    },
    testnet: chain.testnet,
}));

// 钱包连接器配置
const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '';
const appUrl = (import.meta.env.VITE_APP_URL as string) || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');

export const connectors = [
    injected({ target: 'metaMask' }),
    ...(projectId ? [walletConnect({
        projectId,
        metadata: {
            name: 'ZetaFlow',
            description: 'AI 驱动的跨链资产配置器',
            url: appUrl,
            icons: [appUrl + '/favicon.ico'],
        },
    })] : []),
    coinbaseWallet({
        appName: 'ZetaFlow',
        appLogoUrl: appUrl + '/favicon.ico',
    }),
];

// Wagmi 配置
export const wagmiConfig = createConfig({
    chains: [
        ...wagmiChains,
        // 添加标准链作为后备
        sepolia,
    ] as any,
    connectors,
    transports: {
        // 为每个链配置传输层
        ...SUPPORTED_CHAINS.reduce((acc, chain) => {
            acc[chain.id] = http(chain.rpcUrls.default.http[0]);
            return acc;
        }, {} as Record<number, any>),
        [sepolia.id]: http(),
    },
});

// 钱包连接状态类型
export interface WalletState {
    isConnected: boolean;
    address: string | null;
    chainId: number | null;
    connector: any | null;
    isConnecting: boolean;
    isReconnecting: boolean;
}

// 钱包操作接口
export interface WalletActions {
    connect: (connector?: any) => Promise<void>;
    disconnect: () => Promise<void>;
    switchChain: (chainId: number) => Promise<void>;
    addChain: (chain: ChainConfig) => Promise<void>;
}

// 错误类型
export class WalletError extends Error {
    code: string;
    originalError?: any;
    constructor(message: string, code: string, originalError?: any) {
        super(message);
        this.name = 'WalletError';
        this.code = code;
        this.originalError = originalError;
    }
}

// 常见错误代码
export const WALLET_ERROR_CODES = {
    USER_REJECTED: 'USER_REJECTED',
    CHAIN_NOT_SUPPORTED: 'CHAIN_NOT_SUPPORTED',
    INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
    NETWORK_ERROR: 'NETWORK_ERROR',
    CONNECTOR_NOT_FOUND: 'CONNECTOR_NOT_FOUND',
};

// 格式化钱包地址
export function formatAddress(address: string, length = 6): string {
    if (!address) return '';
    return `${address.slice(0, length)}...${address.slice(-4)}`;
}

// 检查是否为支持的链
export function isSupportedWalletChain(chainId: number): boolean {
    return SUPPORTED_CHAINS.some(chain => chain.id === chainId);
}

// 获取链的显示名称
export function getChainDisplayName(chainId: number): string {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
    return chain?.name || `Chain ${chainId}`;
}

// 检查 MetaMask 是否安装
export function isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && !!window.ethereum?.isMetaMask;
}

// 获取钱包图标
export function getWalletIcon(connectorId: string): string {
    const icons: Record<string, string> = {
        'metaMask': 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
        'walletConnect': 'https://walletconnect.com/walletconnect-logo.svg',
        'coinbaseWallet': 'https://www.coinbase.com/img/favicon.ico',
    };
    return icons[connectorId] || '';
}

// 钱包连接辅助函数
export async function connectWallet(connector: any): Promise<WalletState> {
    try {
        await connector.connect();

        const account = await connector.getAccount();
        const chainId = await connector.getChainId();

        return {
            isConnected: true,
            address: account,
            chainId,
            connector,
            isConnecting: false,
            isReconnecting: false,
        };
    } catch (error: any) {
        throw new WalletError(
            '钱包连接失败',
            error.code || WALLET_ERROR_CODES.NETWORK_ERROR,
            error
        );
    }
}

// 切换网络
export async function switchWalletChain(chainId: number): Promise<void> {
    try {
        if (!window.ethereum) {
            throw new WalletError('未检测到钱包', WALLET_ERROR_CODES.CONNECTOR_NOT_FOUND);
        }

        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
    } catch (error: any) {
        // 如果链不存在，尝试添加
        if (error.code === 4902) {
            const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
            if (chain) {
                await addWalletChain(chain);
            }
        } else {
            throw new WalletError(
                '网络切换失败',
                error.code || WALLET_ERROR_CODES.NETWORK_ERROR,
                error
            );
        }
    }
}

// 添加网络到钱包
export async function addWalletChain(chain: ChainConfig): Promise<void> {
    try {
        if (!window.ethereum) {
            throw new WalletError('未检测到钱包', WALLET_ERROR_CODES.CONNECTOR_NOT_FOUND);
        }

        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
                {
                    chainId: `0x${chain.id.toString(16)}`,
                    chainName: chain.name,
                    nativeCurrency: chain.nativeCurrency,
                    rpcUrls: chain.rpcUrls.default.http,
                    blockExplorerUrls: [chain.blockExplorers.default.url],
                },
            ],
        });
    } catch (error: any) {
        throw new WalletError(
            '添加网络失败',
            error.code || WALLET_ERROR_CODES.NETWORK_ERROR,
            error
        );
    }
}

// 监听钱包事件
export function setupWalletEventListeners(
    onAccountsChanged: (accounts: string[]) => void,
    onChainChanged: (chainId: string) => void,
    onConnect: (connectInfo: any) => void,
    onDisconnect: (error: any) => void
): () => void {
    if (!window.ethereum) return () => { };

    window.ethereum.on('accountsChanged', onAccountsChanged);
    window.ethereum.on('chainChanged', onChainChanged);
    window.ethereum.on('connect', onConnect);
    window.ethereum.on('disconnect', onDisconnect);

    // 返回清理函数
    return () => {
        window.ethereum?.removeListener('accountsChanged', onAccountsChanged);
        window.ethereum?.removeListener('chainChanged', onChainChanged);
        window.ethereum?.removeListener('connect', onConnect);
        window.ethereum?.removeListener('disconnect', onDisconnect);
    };
}

// TypeScript 声明
declare global {
    interface Window {
        ethereum?: any;
    }
}
