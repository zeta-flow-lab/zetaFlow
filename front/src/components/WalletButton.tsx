/**
 * 钱包连接按钮组件
 * 提供统一的钱包连接、断开和网络切换界面
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet,
    ChevronDown,
    Power,
    AlertTriangle,
    Copy,
    ExternalLink,
    CheckCircle
} from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { formatAddress, getWalletIcon } from '../lib/wallet';
import { getChainConfig } from '../config/chains';

// 主题 (可以后续移到共享主题文件)
const theme = {
    bg: "#0B0B0E",
    surface: "rgba(255,255,255,0.06)",
    line: "rgba(255,255,255,0.12)",
    text: "#EDEDED",
    subtext: "#B8BDC7",
    accent: "#025b45",
    accentSoft: "#0F8F73",
    green: "#b0ff61",
    warning: "#0F8F73",
    danger: "#FF5C7C",
};

interface WalletButtonProps {
    size?: 'sm' | 'md' | 'lg';
    variant?: 'primary' | 'secondary';
    showBalance?: boolean;
    onConnected?: () => void;
    onDisconnected?: () => void;
}

export default function WalletButton({
    size = 'md',
    variant = 'primary',
    showBalance = false,
    onConnected,
    onDisconnected
}: WalletButtonProps) {
    const {
        isConnected,
        address,
        chainId,
        isConnecting,
        isWrongNetwork,
        connect,
        disconnect,
        switchChain,
        supportedChains,
        error,
        clearError
    } = useWallet();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showToast, setShowToast] = useState(false);

    // 获取当前链配置
    const currentChain = chainId ? getChainConfig(chainId) : null;

    // 连接钱包
    const handleConnect = async () => {
        try {
            await connect();
            onConnected?.();
        } catch (error) {
            console.error('连接钱包失败:', error);
        }
    };

    // 断开连接
    const handleDisconnect = async () => {
        try {
            await disconnect();
            setIsDropdownOpen(false);
            onDisconnected?.();
        } catch (error) {
            console.error('断开连接失败:', error);
        }
    };

    // 切换网络
    const handleSwitchChain = async (targetChainId: number) => {
        try {
            await switchChain(targetChainId);
            setIsDropdownOpen(false);
        } catch (error) {
            console.error('切换网络失败:', error);
        }
    };

    // 复制地址
    const handleCopyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
        }
    };

    // 样式类
    const sizeClasses = {
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    const variantClasses = {
        primary: {
            background: theme.accent,
            color: theme.text,
        },
        secondary: {
            background: "rgba(255,255,255,0.06)",
            color: theme.text,
        },
    };

    // 未连接状态
    if (!isConnected) {
        return (
            <>
                <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className={`inline-flex items-center gap-2 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-60 ${sizeClasses[size]}`}
                    style={variantClasses[variant]}
                >
                    <Wallet size={16} />
                    {isConnecting ? '连接中...' : '连接钱包'}
                </button>

                {/* 错误提示 */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="fixed top-4 right-4 z-50 max-w-sm rounded-lg border p-3"
                            style={{
                                background: theme.surface,
                                borderColor: theme.danger,
                                color: theme.text
                            }}
                        >
                            <div className="flex items-start gap-2">
                                <AlertTriangle size={16} style={{ color: theme.danger }} />
                                <div className="flex-1">
                                    <div className="font-medium text-sm">连接失败</div>
                                    <div className="text-xs opacity-80">{error.message}</div>
                                </div>
                                <button onClick={clearError} className="opacity-60 hover:opacity-100">
                                    <Power size={14} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </>
        );
    }

    // 已连接状态
    return (
        <div className="relative">
            {/* 主按钮 */}
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`inline-flex items-center gap-2 rounded-xl transition-all hover:opacity-90 ${sizeClasses[size]}`}
                style={isWrongNetwork ?
                    { background: theme.danger, color: theme.text } :
                    variantClasses[variant]
                }
            >
                {isWrongNetwork ? (
                    <AlertTriangle size={16} />
                ) : (
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: theme.green }}
                    />
                )}

                <span className="max-w-[120px] truncate">
                    {isWrongNetwork ? '网络错误' : formatAddress(address || '', 4)}
                </span>

                {currentChain && !isWrongNetwork && (
                    <span className="hidden sm:inline text-xs opacity-60">
                        {currentChain.name}
                    </span>
                )}

                <ChevronDown
                    size={14}
                    className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* 下拉菜单 */}
            <AnimatePresence>
                {isDropdownOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-72 rounded-xl border p-3 z-50"
                        style={{
                            background: theme.surface,
                            borderColor: theme.line,
                            backdropFilter: 'blur(20px)'
                        }}
                    >
                        {/* 账户信息 */}
                        <div className="mb-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium" style={{ color: theme.text }}>
                                    已连接账户
                                </span>
                                <button
                                    onClick={handleCopyAddress}
                                    className="p-1 rounded-md hover:bg-white/10 transition-colors"
                                >
                                    <Copy size={14} style={{ color: theme.subtext }} />
                                </button>
                            </div>
                            <div className="font-mono text-sm" style={{ color: theme.subtext }}>
                                {address}
                            </div>
                            {currentChain && (
                                <div className="flex items-center gap-2 mt-2">
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ background: isWrongNetwork ? theme.danger : theme.green }}
                                    />
                                    <span className="text-xs" style={{ color: theme.subtext }}>
                                        {currentChain.name}
                                    </span>
                                    {currentChain.testnet && (
                                        <span
                                            className="text-xs px-1 py-0.5 rounded"
                                            style={{ background: theme.warning + '20', color: theme.warning }}
                                        >
                                            测试网
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 网络切换 */}
                        {isWrongNetwork && (
                            <div className="mb-3">
                                <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>
                                    切换到支持的网络
                                </div>
                                <div className="space-y-1">
                                    {supportedChains.slice(0, 3).map((chain) => (
                                        <button
                                            key={chain.id}
                                            onClick={() => handleSwitchChain(chain.id)}
                                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                                        >
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ background: chain.testnet ? theme.warning : theme.green }}
                                            />
                                            <span className="text-sm" style={{ color: theme.text }}>
                                                {chain.name}
                                            </span>
                                            {chain.testnet && (
                                                <span className="text-xs opacity-60" style={{ color: theme.subtext }}>
                                                    测试网
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 操作按钮 */}
                        <div className="flex gap-2">
                            {currentChain?.blockExplorers && (
                                <a
                                    href={`${currentChain.blockExplorers.default.url}/address/${address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors hover:bg-white/5"
                                    style={{ borderColor: theme.line, color: theme.text }}
                                >
                                    <ExternalLink size={14} />
                                    <span className="text-sm">浏览器</span>
                                </a>
                            )}

                            <button
                                onClick={handleDisconnect}
                                className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg transition-colors hover:bg-red-500/10"
                                style={{ color: theme.danger }}
                            >
                                <Power size={14} />
                                <span className="text-sm">断开连接</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 点击外部关闭下拉菜单 */}
            {isDropdownOpen && (
                <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsDropdownOpen(false)}
                />
            )}

            {/* 复制成功提示 */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-lg"
                        style={{ background: theme.surface, color: theme.text }}
                    >
                        <CheckCircle size={16} style={{ color: theme.green }} />
                        <span className="text-sm">地址已复制</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


