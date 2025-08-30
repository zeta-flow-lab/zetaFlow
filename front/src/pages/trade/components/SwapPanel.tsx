import { useState } from 'react';
import type { Address, Hex, PublicClient, WalletClient } from 'viem';
import { swapViaToolkit } from '../../../lib/toolkit';
import { getUniversalAppAddress } from '../../../config/addresses';

type Props = {
    publicClient: PublicClient;
    walletClient: WalletClient;
};

export default function SwapPanel(_props: Props) {
    const [planId, setPlanId] = useState<Hex>('0x');
    const [tokenIn, setTokenIn] = useState<Address>('0x');
    const [tokenOut, setTokenOut] = useState<Address>('0x');
    const [amountIn, setAmountIn] = useState<string>('0');
    const [minOut, setMinOut] = useState<string>('0');
    const [path, setPath] = useState<string>('');
    const [deadline, setDeadline] = useState<string>('0');
    const [submitting, setSubmitting] = useState(false);

    async function onSubmit() {
        try {
            setSubmitting(true);
            const { BrowserProvider } = await import('ethers');
            const browser = new BrowserProvider((window as any).ethereum);
            const signer = await browser.getSigner();
            const app = getUniversalAppAddress(7001) as string;
            const p: string[] = path.split(',').map(s => s.trim()).filter(Boolean);
            await swapViaToolkit({ signer, app, planId, tokenIn, tokenOut, amountIn, minOut, path: p, deadline: deadline || (Math.floor(Date.now() / 1000) + 1800) });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div style={{ border: '1px solid #333', padding: 12, borderRadius: 8 }}>
            <h3>资产配置（Swap，仅 ZEVM，Toolkit 封装）</h3>
            <div>planId: <input value={planId} onChange={e => setPlanId(e.target.value as Hex)} /></div>
            <div>tokenIn: <input value={tokenIn} onChange={e => setTokenIn(e.target.value as Address)} /></div>
            <div>tokenOut: <input value={tokenOut} onChange={e => setTokenOut(e.target.value as Address)} /></div>
            <div>amountIn: <input value={amountIn} onChange={e => setAmountIn(e.target.value)} /></div>
            <div>minOut: <input value={minOut} onChange={e => setMinOut(e.target.value)} /></div>
            <div>path(逗号分隔): <input value={path} onChange={e => setPath(e.target.value)} /></div>
            <div>deadline(秒): <input value={deadline} onChange={e => setDeadline(e.target.value)} /></div>
            <button onClick={onSubmit} disabled={submitting}>执行 Swap</button>
        </div>
    );
}


