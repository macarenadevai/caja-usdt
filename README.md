# 🧾 Quinto — your business in USD₮

**Aleph Hackathon 2026 · WDK Track (Tether)**

Quinto turns a business wallet into a USD₮ cash register: **collect** with
QR + live confirmation, **send** remittances with package-style tracking, and
**delegate** operations to an AI agent that connects to WDK through MCP.
Non-custodial, multi-chain, no banks.

> Demo: 3-minute video script in `DEMO.md`.

---

## The problem

In LATAM, a business that wants to operate in USD₮ runs into:

1. **Collecting** — the business wallet is not a point of sale: no QR, no
   visual confirmation that the payment arrived.
2. **Sending** — sending a remittance (supplier, family) is an opaque
   transaction: signatures, waiting, and you can't tell if it arrived.
3. **Operating** — managing the wallet means touching a command line or
   depending on fragmented tools.

## The solution

A single app with **one wallet** (created by the WDK CLI) and three views:

| View | What it does | How |
|------|--------------|-----|
| 💵 **Collect** | Crypto POS: amount → QR → customer pays → live confirmation | Payment detector verifying on-chain receipts every 5s |
| 📦 **Send** | Remittances with tracking (sent → confirmed → failed) | `wdk send` + receipt verification on Sepolia |
| 🤖 **Agent** | Chat that operates the cashbox: balance, transfers, with **human confirmation** | `wdk-mcp` + DeepSeek (function calling) |
| 📱 **PWA** | Installable: your phone is your point-of-sale terminal | Manifest + Service Worker (offline shell) |

### Why WDK is the core

Every wallet operation goes through the **WDK CLI** as a subprocess
(`wdk wallet`, `wdk get`, `wdk send`), and the AI agent talks to the wallet
through the **`wdk-mcp` server** (MCP Client in Node). The CLI is the core
building block of the whole system — literally every frontend request ends
in a `wdk` command.

```
Frontend (Next.js) ──HTTP──▶ API (Express) ──subprocess──▶ wdk CLI
      │                              │
      │                              └─MCP client──────▶ wdk-mcp server
      └──── polling ────────────────▶ Payment detector (Sepolia receipts)
```

### 🔗 WDK integration (permalinks)

| File | WDK role |
|------|----------|
| [`server/wdk.js`](https://github.com/macarenadevai/caja-usdt/blob/main/server/wdk.js) | **WDK CLI** wrapper as subprocess: `wallet unlock`, `get balance`, `get address`, `send --dry-run`, `send` (core) |
| [`server/agent.js`](https://github.com/macarenadevai/caja-usdt/blob/main/server/agent.js) | **MCP** client → `wdk-mcp` server: the agent reads balance and proposes `send_token` with `dryRun=true` |
| [`server/payments.js`](https://github.com/macarenadevai/caja-usdt/blob/main/server/payments.js) | Payment detector: confirms on-chain receipts (Sepolia RPC) |
| [`server/package.json`](https://github.com/macarenadevai/caja-usdt/blob/main/server/package.json) | Declared WDK dependencies |
| [`scripts/ensayo.sh`](https://github.com/macarenadevai/caja-usdt/blob/main/scripts/ensayo.sh) | End-to-end test: collect → real payment → confirmation → ledger |

### 📦 Installed WDK packages

| Package | Version | Use |
|---------|---------|-----|
| `@tetherto/wdk` | 1.0.0-beta.6 | Core of the kit (SDK) |
| `@tetherto/wdk-cli` | 1.0.0-beta.2 | CLI with bundled `wdk-mcp` — the server's subprocess core |
| `@tetherto/wdk-wallet-evm` | 1.0.0-beta.11 | EVM wallet (Sepolia, USDT) |
| `@tetherto/wdk-wallet-evm-erc-4337` | 1.0.0-beta.6 | ERC-4337 module (future gasless) |

> The agent uses the **`wdk-mcp` server** (bundled with the CLI) as its core
> block: `connectMcp()` spawns it as a subprocess and exposes its tools
> (`get_balance`, `get_address`, `send_token`, …) to the LLM via MCP.

## Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS v4, TypeScript
- **Backend**: Node.js 22, Express 5
- **Wallet**: WDK CLI `@tetherto/wdk-cli@1.0.0-beta.2` (Tether)
- **Agent**: `wdk-mcp` (MCP server) + DeepSeek (function calling)
- **Demo network**: Sepolia (ETH + mock USDT)

## How to run

### Prerequisites

- Node.js ≥ 22.18 (WDK CLI requirement)
- WDK CLI: `npm install -g --allow-scripts=@tetherto/wdk-cli @tetherto/wdk-cli@1.0.0-beta.2`

### 1. Create the business wallet

```bash
export WDK_PASSPHRASE="<your-passphrase>"
wdk wallet create --name caja
wdk wallet default --name caja
```

### 2. Configure the backend

```bash
cd server
cp .env.example .env
# edit .env: WDK_PASSPHRASE, DEEPSEEK_API_KEY, PORT=8788
npm install
node index.js
```

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000 (landing) · http://localhost:3000/app (app)
```

### 4. Fund the cashbox (testnet)

On Sepolia, the mock USDT comes from faucets (Candide / Pimlico).
Request **USDT + ETH** to the cashbox address (`wdk get address --network sepolia`).

## API

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/status` | Wallet, balance, address |
| GET | `/api/balance?network=sepolia` | Balance (native or token) |
| GET | `/api/address?network=sepolia` | Cashbox address |
| POST | `/api/invoice` `{amount}` | Creates a payment (QR) |
| GET | `/api/invoice/:id` | Payment status |
| POST | `/api/send` `{to, amount, confirm}` | Sends USDT (requires confirmation) |
| GET | `/api/transfer/:id` | Transfer status (tracking) |
| GET | `/api/transactions` | Full ledger |
| POST | `/api/agent/message` `{text}` | Chat with the agent |
| POST | `/api/agent/confirm` `{proposalId}` | Confirms a proposed transfer |
| POST | `/api/agent/reject` `{proposalId}` | Rejects/cancels a proposal |

## Security

- **Non-custodial**: the seed lives in the business's WDK CLI wallet, protected
  by a passphrase (`WDK_PASSPHRASE` in `.env`, never in git).
- **The agent never executes transfers without human confirmation**:
  `send_token` always goes through `dryRun` → proposal → the human confirms.
- The passphrase and the API key are excluded from the repo (`.gitignore`).

## Key technical decisions

| Decision | Chosen option | Why |
|----------|---------------|-----|
| Wallet core | WDK CLI as subprocess | Prize 1: CLI as core building block; official data |
| Payment confirmation | On-chain receipts (Sepolia RPC) | Real state, not simulated |
| Payment detector | On-chain `Transfer` events (`eth_getLogs`) | Exact-amount matching; a top-up doesn't fake payments |
| AI agent | MCP client → `wdk-mcp` + DeepSeek | Prize 1: MCP server as core block |
| Frontend | Next.js + Tailwind v4 (ZTL template) | Defined aesthetic, fast build |
| Storage | Atomic `state.json` | Zero deps, enough for the demo |

## Structure

```
aleph-hackathon/
├── SPEC.md            # Spec (SDD): user stories, plan, decisions
├── DEMO.md            # 3-minute demo script
├── server/            # Express backend + WDK
│   ├── wdk.js         # CLI wrapper (core)
│   ├── payments.js    # Payment detector + receipts
│   ├── agent.js       # MCP client + DeepSeek
│   ├── state.js       # Persistent state
│   └── index.js       # REST API
└── frontend/          # Next.js 16
    ├── components/    # pdv.tsx, enviar.tsx, agente.tsx
    └── lib/api.ts     # API client
```

## License

MIT
