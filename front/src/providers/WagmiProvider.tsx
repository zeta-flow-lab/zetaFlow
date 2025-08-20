/**
 * Wagmi Provider 配置
 * 为整个应用提供钱包连接状态管理
 */

import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '../lib/wallet';

// 创建 QueryClient 实例
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 3,
            staleTime: 5 * 60 * 1000, // 5 分钟
            gcTime: 10 * 60 * 1000,   // 10 分钟 (原 cacheTime)
        },
    },
});

interface WagmiAppProviderProps {
    children: React.ReactNode;
}

export default function WagmiAppProvider({ children }: WagmiAppProviderProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <WagmiProvider config={wagmiConfig}>
                {children}
            </WagmiProvider>
        </QueryClientProvider>
    );
}


