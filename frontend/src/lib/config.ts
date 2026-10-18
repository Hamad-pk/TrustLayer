import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

/** Block in which the Sepolia TrustLayer contract was deployed. Event queries start here. */
export const SEPOLIA_DEPLOY_BLOCK = 11932110n

/**
 * Event-log reads use their own endpoint: many free RPC plans cap eth_getLogs to a tiny block range even though
 * ordinary reads work. Override with VITE_LOGS_RPC_URL in .env.local if the default public node is unavailable.
 */
export const logsClient = createPublicClient({
  chain: sepolia,
  transport: http(import.meta.env.VITE_LOGS_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'),
})
