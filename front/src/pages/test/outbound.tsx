import React, { useEffect, useMemo, useState } from 'react';
import { usePublicClient, useWalletClient, useSwitchChain } from 'wagmi';
import { parseAbi, parseUnits } from 'viem';
import { getUniversalAppAddress, ZETACHAIN_ATHENS_TOKENS } from '../../config/addresses';

const UNIVERSAL_APP_ABI = parseAbi([
    'function executeWithdrawStep(bytes32 planId, address token, uint256 amount, bytes receiver, bytes dstCalldata, (address revertAddress,bool callOnRevert,address abortAddress,bytes revertMessage,uint256 onRevertGasLimit) revertOptions) external'
] as const);

export default function OutboundTestPage() {
    const athensClient = usePublicClient({ chainId: 7001 } as any);
    const { data: walletClient } = useWalletClient();
    const { switchChain } = useSwitchChain();

    const [planId, setPlanId] = useState<string>('');
    const [tokenSymbol, setTokenSymbol] = useState<string>('ETH');
    const [tokenDecimals, setTokenDecimals] = useState<number>(18);
    const [amount, setAmount] = useState<string>('0.1');
    const [receiver, setReceiver] = useState<string>('');
    const [txHash, setTxHash] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [appBalance, setAppBalance] = useState<string>('');

    const universalApp = useMemo(() => getUniversalAppAddress(7001), []);
    const tokenAddress = useMemo(() => ZETACHAIN_ATHENS_TOKENS[tokenSymbol?.toUpperCase?.() || 'ETH'], [tokenSymbol]);

    useEffect(() => {
        (async () => {
            try {
                if (!athensClient || !tokenAddress) return;
                const erc20Abi = parseAbi([
                    'function decimals() view returns (uint8)',
                    'function balanceOf(address) view returns (uint256)'
                ] as const);
                const dec = (await athensClient.readContract({
                    abi: erc20Abi,
                    address: tokenAddress as any,
                    functionName: 'decimals'
                })) as number;
                if (typeof dec === 'number' && dec > 0 && dec <= 36) setTokenDecimals(dec);
                if (universalApp) {
                    const bal = (await athensClient.readContract({
                        abi: erc20Abi,
                        address: tokenAddress as any,
                        functionName: 'balanceOf',
                        args: [universalApp as `0x${string}`]
                    })) as bigint;
                    setAppBalance(bal.toString());
                }
            } catch { }
        })();
    }, [athensClient, tokenAddress, universalApp]);

    async function handleExecuteWithdraw() {
        setError('');
        setTxHash('');
        try {
            if (!athensClient) throw new Error('Athens PublicClient 不可用');
            if (!walletClient) throw new Error('钱包未连接');
            if (!universalApp) throw new Error('未配置 Universal App 地址');
            if (!planId || !/^0x[0-9a-fA-F]{64}$/.test(planId)) throw new Error('请输入有效的 planId');
            if (!tokenAddress) throw new Error('未选择有效的 ZRC-20 代币');
            if (!receiver || !/^0x[0-9a-fA-F]{40}$/.test(receiver)) throw new Error('请输入 EVM 接收地址');

            // 切换到 Athens 执行
            if (walletClient.chain?.id !== 7001) {
                await switchChain({ chainId: 7001 });
            }

            setLoading(true);
            const amountWei = parseUnits(amount, tokenDecimals);
            const receiverBytes = receiver as `0x${string}`; // 20字节 EVM 地址
            const revertOptions = {
                revertAddress: universalApp as `0x${string}`,
                callOnRevert: true,
                abortAddress: universalApp as `0x${string}`,
                revertMessage: '0x',
                onRevertGasLimit: BigInt(300000),
            } as const;

            const hash = await walletClient.writeContract({
                abi: UNIVERSAL_APP_ABI,
                address: universalApp as `0x${string}`,
                functionName: 'executeWithdrawStep',
                args: [
                    planId as `0x${string}`,
                    tokenAddress as `0x${string}`,
                    amountWei,
                    receiverBytes,
                    '0x',
                    revertOptions,
                ],
                account: walletClient.account!,
                chain: walletClient.chain!,
            });
            setTxHash(hash);
            await athensClient.waitForTransactionReceipt({ hash, pollingInterval: 2000, timeout: 180_000 });
        } catch (e: any) {
            setError(e?.message || '执行失败');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">手动出站测试（Athens 7001）</h2>
            <div className="space-y-3">
                <div>
                    <label className="text-sm">Plan ID (bytes32)</label>
                    <input className="w-full border rounded p-2" placeholder="0x..." value={planId} onChange={(e) => setPlanId(e.target.value)} />
                </div>
                <div>
                    <label className="text-sm">ZRC-20 代币</label>
                    <select className="w-full border rounded p-2" value={tokenSymbol} onChange={(e) => setTokenSymbol(e.target.value)}>
                        {Object.keys(ZETACHAIN_ATHENS_TOKENS).map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <div className="text-xs opacity-70">地址：{tokenAddress}</div>
                    {appBalance && (
                        <div className="text-xs opacity-70">合约余额：{appBalance}</div>
                    )}
                </div>
                <div>
                    <label className="text-sm">金额（{tokenDecimals} 位小数）</label>
                    <input className="w-full border rounded p-2" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div>
                    <label className="text-sm">接收地址（EVM 20字节）</label>
                    <input className="w-full border rounded p-2" placeholder="0x接收地址（目标链 EVM）" value={receiver} onChange={(e) => setReceiver(e.target.value)} />
                </div>
                <div className="pt-2">
                    <button className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-60" disabled={loading} onClick={handleExecuteWithdraw}>
                        {loading ? '执行中…' : '执行 Withdraw'}
                    </button>
                </div>
                {txHash && (
                    <div className="text-sm">Tx: <a className="underline" href={`https://athens.explorer.zetachain.com/tx/${txHash}`} target="_blank" rel="noreferrer">{txHash}</a></div>
                )}
                {error && (
                    <div className="text-sm text-red-500">{error}</div>
                )}
            </div>
        </div>
    );
}


