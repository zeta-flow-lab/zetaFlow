/**
 * 钱包状态管理 Hook
 * 基于 wagmi 提供统一的钱包操作接口
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import {
    type WalletState,
    type WalletActions,
    WalletError,
    WALLET_ERROR_CODES,
    isSupportedWalletChain,
    getChainDisplayName,
    setupWalletEventListeners
} from '../lib/wallet';
import { SUPPORTED_CHAINS } from '../config/chains';

export interface UseWalletReturn extends WalletState, WalletActions {
    // 额外的状态
    isWrongNetwork: boolean;
    supportedChains: typeof SUPPORTED_CHAINS;

    // 额外的操作
    reconnect: () => Promise<void>;
    getBalance: (tokenAddress?: string) => Promise<string>;

    // 错误状态
    error: WalletError | null;
    clearError: () => void;
}

export function useWallet(): UseWalletReturn {
    const { address, isConnected, connector, status } = useAccount();
    const { connect, connectors, isPending: isConnecting } = useConnect();
    const { disconnect } = useDisconnect();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();

    const [error, setError] = useState<WalletError | null>(null);
    const [isReconnecting, setIsReconnecting] = useState(false);

    // 检查是否在错误的网络
    const isWrongNetwork = isConnected && !isSupportedWalletChain(chainId);

    // 清除错误
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // 连接钱包
    const handleConnect = useCallback(async (targetConnector?: any) => {
        try {
            clearError();
            const connectorToUse = targetConnector || connectors[0];

            if (!connectorToUse) {
                throw new WalletError(
                    '未找到可用的钱包连接器',
                    WALLET_ERROR_CODES.CONNECTOR_NOT_FOUND
                );
            }

            await connect({ connector: connectorToUse });
        } catch (err: any) {
            const error = err instanceof WalletError
                ? err
                : new WalletError(
                    '钱包连接失败',
                    err.code || WALLET_ERROR_CODES.NETWORK_ERROR,
                    err
                );
            setError(error);
            throw error;
        }
    }, [connect, connectors, clearError]);

    // 断开连接
    const handleDisconnect = useCallback(async () => {
        try {
            clearError();
            await disconnect();
        } catch (err: any) {
            const error = new WalletError(
                '断开连接失败',
                WALLET_ERROR_CODES.NETWORK_ERROR,
                err
            );
            setError(error);
            throw error;
        }
    }, [disconnect, clearError]);

    // 切换网络
    const handleSwitchChain = useCallback(async (targetChainId: number) => {
        try {
            clearError();

            if (!isSupportedWalletChain(targetChainId)) {
                throw new WalletError(
                    `不支持的网络: ${getChainDisplayName(targetChainId)}`,
                    WALLET_ERROR_CODES.CHAIN_NOT_SUPPORTED
                );
            }

            await switchChain({ chainId: targetChainId });
        } catch (err: any) {
            const error = err instanceof WalletError
                ? err
                : new WalletError(
                    '网络切换失败',
                    err.code || WALLET_ERROR_CODES.NETWORK_ERROR,
                    err
                );
            setError(error);
            throw error;
        }
    }, [switchChain, clearError]);

    // 添加网络
    const handleAddChain = useCallback(async (chain: any) => {
        try {
            clearError();

            if (!window.ethereum) {
                throw new WalletError(
                    '未检测到钱包',
                    WALLET_ERROR_CODES.CONNECTOR_NOT_FOUND
                );
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
        } catch (err: any) {
            const error = new WalletError(
                '添加网络失败',
                err.code || WALLET_ERROR_CODES.NETWORK_ERROR,
                err
            );
            setError(error);
            throw error;
        }
    }, [clearError]);

    // 重连
    const reconnect = useCallback(async () => {
        if (!connector) return;

        try {
            setIsReconnecting(true);
            clearError();

            // 尝试重新连接当前连接器
            await connect({ connector });
        } catch (err: any) {
            const error = new WalletError(
                '重连失败',
                WALLET_ERROR_CODES.NETWORK_ERROR,
                err
            );
            setError(error);
            throw error;
        } finally {
            setIsReconnecting(false);
        }
    }, [connector, connect, clearError]);

    // 获取余额
    const getBalance = useCallback(async (tokenAddress?: string): Promise<string> => {
        if (!address || !window.ethereum) {
            throw new WalletError(
                '钱包未连接',
                WALLET_ERROR_CODES.CONNECTOR_NOT_FOUND
            );
        }

        try {
            if (!tokenAddress) {
                // 获取原生代币余额
                const balance = await window.ethereum.request({
                    method: 'eth_getBalance',
                    params: [address, 'latest'],
                });
                return balance;
            } else {
                // 获取 ERC-20 代币余额 (需要进一步实现)
                // 这里简化处理，实际需要调用合约的 balanceOf 方法
                return '0x0';
            }
        } catch (err: any) {
            throw new WalletError(
                '获取余额失败',
                WALLET_ERROR_CODES.NETWORK_ERROR,
                err
            );
        }
    }, [address]);

    // 监听钱包事件
    useEffect(() => {
        const cleanup = setupWalletEventListeners(
            (accounts: string[]) => {
                if (accounts.length === 0) {
                    handleDisconnect();
                }
            },
            (newChainId: string) => {
                const chainIdNum = parseInt(newChainId, 16);
                if (!isSupportedWalletChain(chainIdNum)) {
                    setError(new WalletError(
                        `当前网络不受支持: ${getChainDisplayName(chainIdNum)}`,
                        WALLET_ERROR_CODES.CHAIN_NOT_SUPPORTED
                    ));
                } else {
                    clearError();
                }
            },
            () => {
                clearError();
            },
            (error: any) => {
                setError(new WalletError(
                    '钱包连接断开',
                    WALLET_ERROR_CODES.NETWORK_ERROR,
                    error
                ));
            }
        );

        return cleanup;
    }, [handleDisconnect, clearError]);

    // 构建返回对象
    const walletState: WalletState = {
        isConnected,
        address: address || null,
        chainId: chainId || null,
        connector,
        isConnecting,
        isReconnecting,
    };

    const walletActions: WalletActions = {
        connect: handleConnect,
        disconnect: handleDisconnect,
        switchChain: handleSwitchChain,
        addChain: handleAddChain,
    };

    return {
        ...walletState,
        ...walletActions,
        isWrongNetwork,
        supportedChains: SUPPORTED_CHAINS,
        reconnect,
        getBalance,
        error,
        clearError,
    };
}

// 钱包连接状态的便捷 Hook
export function useWalletConnection() {
    const { isConnected, address, chainId, isConnecting, connect, disconnect } = useWallet();

    return {
        isConnected,
        address,
        chainId,
        isConnecting,
        connect,
        disconnect,
    };
}

// 网络状态的便捷 Hook
export function useNetworkStatus() {
    const { chainId, isWrongNetwork, switchChain, supportedChains } = useWallet();

    return {
        chainId,
        isWrongNetwork,
        switchChain,
        supportedChains,
    };
}


