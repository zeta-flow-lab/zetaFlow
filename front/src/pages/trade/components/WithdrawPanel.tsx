import { useEffect, useState } from 'react';
import type { Address, Hex, PublicClient, WalletClient } from 'viem';
import { withdrawViaToolkit } from '../../../lib/toolkit';
import { getUniversalAppAddress } from '../../../config/addresses';

type Props = {
    publicClient: PublicClient;
    walletClient: WalletClient;
};

export default function WithdrawPanel({ publicClient }: Props) {
    const [planId, setPlanId] = useState<Hex>('0x');
    const [token, setToken] = useState<Address>('0x');
    const [amount, setAmount] = useState<string>('0');
    const [receiver, setReceiver] = useState<Address>('0x');
    const [dstCalldata, setDstCalldata] = useState<Hex>('0x');
    const [gasHint, setGasHint] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancel = false;
        (async () => {
            try {
                if (!token || token === '0x') return;
                const abi = [{ name: 'withdrawGasFee', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }, { type: 'uint256' }] }] as const;
                const [gasZRC20, fee] = await publicClient.readContract({ abi: abi as any, address: token, functionName: 'withdrawGasFee', args: [] }) as any;
                if (!cancel) setGasHint(`目标链 gasZRC20=${gasZRC20}, fee=${fee.toString()}`);
            } catch (e) {
                if (!cancel) setGasHint('无法读取 withdrawGasFee，目标 token 可能不支持');
            }
        })();
        return () => { cancel = true; };
    }, [publicClient, token]);

    async function onSubmit() {
        try {
            setSubmitting(true);
            const { BrowserProvider } = await import('ethers');
            const browser = new BrowserProvider((window as any).ethereum);
            const signer = await browser.getSigner();
            const universal = getUniversalAppAddress(7001) as string;
            await withdrawViaToolkit({
                signer,
                app: universal,
                planId,
                token,
                amount,
                receiver,
                dstCalldata,
                revertOptions: {
                    callOnRevert: false,
                    revertMessage: '0x',
                    abortAddress: universal,
                }
            });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div style={{ border: '1px solid #333', padding: 12, borderRadius: 8 }}>
            <h3>出站（Toolkit 封装 / 回退到 Universal.executeWithdrawStep）</h3>
            <div>planId: <input value={planId} onChange={e => setPlanId(e.target.value as Hex)} /></div>
            <div>token(ZRC20): <input value={token} onChange={e => setToken(e.target.value as Address)} /></div>
            <div>amount: <input value={amount} onChange={e => setAmount(e.target.value)} /></div>
            <div>receiver(EVM地址): <input value={receiver} onChange={e => setReceiver(e.target.value as Address)} /></div>
            <div>dstCalldata(hex): <input value={dstCalldata} onChange={e => setDstCalldata(e.target.value as Hex)} /></div>
            <div style={{ color: '#888' }}>{gasHint}</div>
            <button onClick={onSubmit} disabled={submitting}>执行出站</button>
        </div>
    );
}


