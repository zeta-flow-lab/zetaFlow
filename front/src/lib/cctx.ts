export type CctxStatus = 'PendingOutbound' | 'OutboundMined' | 'Aborted' | 'Reverted' | 'Delivered' | 'Unknown';

export type CctxResult = {
    status: CctxStatus;
    sourceTxHash?: string;
    zevmTxHash?: string;
    destinationTxHash?: string;
    cctxId?: string;
};

async function tryFetch(url: string) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        return await res.json();
    } catch (_) {
        return undefined;
    }
}

export async function pollCctxBySourceTx(sourceTxHash: string, opts?: { timeoutMs?: number; intervalMs?: number }): Promise<CctxResult> {
    const timeoutAt = Date.now() + (opts?.timeoutMs ?? 180000);
    const interval = opts?.intervalMs ?? 5000;
    let last: CctxResult = { status: 'Unknown', sourceTxHash };

    while (Date.now() < timeoutAt) {
        // 尝试多种已知（和可能）的 CCTX 查询端点
        const candidates = [
            // Explorer 端点（示例，可能变更）
            `https://athens.explorer.zetachain.com/api/cctx/${sourceTxHash}`,
            // LCD/REST（不同服务商路径可能不同，逐一尝试）
            `https://zetachain-athens.blockpi.network/lcd/v1/cctx/${sourceTxHash}`,
            `https://zetachain-athens.blockpi.network/lcd/v1/zetacore/crosschain/cctx/${sourceTxHash}`,
        ];

        let payload: any | undefined;
        for (const url of candidates) {
            const json = await tryFetch(url);
            if (json) { payload = json; break; }
        }

        if (payload) {
            // 宽松解析：不同端点字段命名不同，这里尝试常见字段
            const cctxId = payload.cctx_id || payload.cctxId || payload.id || payload.CCTX || payload.cctx?.id;
            const status: CctxStatus = (payload.status || payload.cctx_status || payload.cctx?.status || 'Unknown') as CctxStatus;
            const src = payload.source_tx_hash || payload.inbound_tx_hash || payload.source?.txHash || sourceTxHash;
            const zevm = payload.zevm_tx_hash || payload.zevmTxHash || payload.destination?.zetachainTxHash || payload.tx_hash_7001;
            const dst = payload.destination_tx_hash || payload.outbound_tx_hash || payload.destination?.txHash;

            last = { status, sourceTxHash: src, zevmTxHash: zevm, destinationTxHash: dst, cctxId };
            if (status === 'OutboundMined' || status === 'Delivered' || status === 'Reverted' || status === 'Aborted') {
                return last;
            }
        }

        await new Promise(r => setTimeout(r, interval));
    }

    return last;
}

export async function pollCctxByZevmTx(zevmTxHash: string, opts?: { timeoutMs?: number; intervalMs?: number }): Promise<CctxResult> {
    const timeoutAt = Date.now() + (opts?.timeoutMs ?? 180000);
    const interval = opts?.intervalMs ?? 5000;
    let last: CctxResult = { status: 'Unknown', zevmTxHash };

    while (Date.now() < timeoutAt) {
        const candidates = [
            `https://athens.explorer.zetachain.com/api/cctx/by_zevm/${zevmTxHash}`,
            `https://zetachain-athens.blockpi.network/lcd/v1/cctx/by_zevm/${zevmTxHash}`,
            `https://zetachain-athens.blockpi.network/lcd/v1/zetacore/crosschain/cctx/by_zevm/${zevmTxHash}`,
        ];

        let payload: any | undefined;
        for (const url of candidates) {
            const json = await tryFetch(url);
            if (json) { payload = json; break; }
        }

        if (payload) {
            const cctxId = payload.cctx_id || payload.id || payload.cctx?.id;
            const status: CctxStatus = (payload.status || payload.cctx?.status || 'Unknown') as CctxStatus;
            const src = payload.source_tx_hash || payload.source?.txHash;
            const dst = payload.destination_tx_hash || payload.outbound_tx_hash || payload.destination?.txHash;
            last = { status, sourceTxHash: src, zevmTxHash, destinationTxHash: dst, cctxId };
            if (status === 'OutboundMined' || status === 'Delivered' || status === 'Reverted' || status === 'Aborted') {
                return last;
            }
        }
        await new Promise(r => setTimeout(r, interval));
    }

    return last;
}


