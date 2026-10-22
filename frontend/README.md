# TrustLayer Frontend

The TrustLayer interface is a React, TypeScript, and Vite application for interacting with the TrustLayer escrow contract deployed on the Sepolia test network.

## Requirements

- Node.js 24.x
- npm
- A browser wallet configured for Sepolia
- Sepolia test ETH for transactions

## Setup

From the repository root:

```bash
cd frontend
npm ci
cp .env.example .env.local
```

Set `VITE_SEPOLIA_RPC_URL` in `.env.local` to a Sepolia RPC endpoint. The app reads event history from a separate public Sepolia RPC by default; set `VITE_LOGS_RPC_URL` if you need to override it.

**Security:** Variables prefixed with `VITE_` are exposed to browser code. Never store wallet private keys or other secrets in them.

## Commands

Start the development server:

```bash
npm run dev
```

Build the production frontend:

```bash
npm run build
```

Run the linter:

```bash
npm run lint
```

Preview the production build:

```bash
npm run build
npm run preview
```

## Network scope

The current dApp targets the TrustLayer deployment on Sepolia. Although the wallet configuration recognizes a local Foundry chain, the frontend screens and contract address are wired to Sepolia. Local Anvil use is not yet supported end to end.

This project is intended for testnet demonstration only. Do not use real funds.
