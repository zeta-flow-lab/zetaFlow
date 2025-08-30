import { useState } from 'react';
import type { Address, PublicClient, WalletClient } from 'viem';
import { getUniversalAppAddress } from '../../../config/addresses';
import { depositAndCallViaToolkit } from '../../../lib/toolkit';

type Props = {
    publicClient: PublicClient;
    walletClient: WalletClient;
};

export default function InboundPanel(_props: Props) {
    const [chainId, setChainId] = useState<number>(11155111);
    const [useERC20, setUseERC20] = useState(false);
    const [erc20, setErc20] = useState<Address>('0x0000000000000000000000000000000000000000');
    const [amount, setAmount] = useState<string>('0.02');
    const [planData, setPlanData] = useState<string>('["ETH"],[10000]');
    const [submitting, setSubmitting] = useState(false);

    const universal = getUniversalAppAddress(7001) as Address;

    async function onSubmit() {
        try {
            setSubmitting(true);
            const [symbolsStr, weightsStr] = planData.split('],');
            const symbols = JSON.parse(symbolsStr + ']');
            const weights = JSON.parse(weightsStr.startsWith('[') ? weightsStr : '[' + weightsStr);
            const abiEncoded = (await import('viem')).encodeAbiParameters([
                { type: 'string[]' },
                { type: 'uint256[]' }
            ], [symbols, weights]);

            const { BrowserProvider } = await import('ethers');
            const browser = new BrowserProvider((window as any).ethereum);
            const signer = await browser.getSigner();

            await depositAndCallViaToolkit({
                signer,
                universal,
                amount: useERC20 ? String(BigInt(amount)) : amount,
                token: useERC20 ? erc20 : undefined,
                data: abiEncoded as string,
                revertOptions: {
                    revertAddress: '0x0000000000000000000000000000000000000000',
                    callOnRevert: false,
                    abortAddress: universal,
                    revertMessage: '0x',
                    onRevertGasLimit: 0,
                },
            });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div style={{ border: '1px solid #333', padding: 12, borderRadius: 8 }}>
            <h3>入站（Toolkit: evmDepositAndCall）</h3>
            <div>源链 ChainId: <input value={chainId} onChange={e => setChainId(Number(e.target.value || '0'))} /></div>
            <div>
                <label>
                    <input type="checkbox" checked={useERC20} onChange={e => setUseERC20(e.target.checked)} /> 使用 ERC20 入站
                </label>
            </div>
            {useERC20 ? (
                <div>ERC20 地址: <input value={erc20} onChange={e => setErc20(e.target.value as Address)} /></div>
            ) : (
                <div>原生金额(ETH/BNB...): <input value={amount} onChange={e => setAmount(e.target.value)} /></div>
            )}
            <div>计划 ("[\"ETH\"],[10000]"): <input style={{ width: '100%' }} value={planData} onChange={e => setPlanData(e.target.value)} /></div>
            <button onClick={onSubmit} disabled={submitting}>发送入站</button>
        </div>
    );
}


