// Print Gateway address for a given chainId using @zetachain/toolkit
// Usage: node scripts/gateway-address.cjs 7001

/* eslint-disable @typescript-eslint/no-var-requires */
try {
    const z = require('@zetachain/toolkit');
    const chainId = Number(process.argv[2] || '7001');
    let addr = '';
    if (typeof z.getGatewayAddress === 'function') {
        try { addr = z.getGatewayAddress(chainId) || ''; } catch (_) { }
    }
    if (!addr && z.addresses && z.addresses.gateway) {
        addr = z.addresses.gateway[chainId] || '';
    }
    process.stdout.write(String(addr || ''));
} catch (e) {
    process.stdout.write('');
}


