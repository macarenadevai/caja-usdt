# 🧾 Caja — tu negocio en USD₮

**Aleph Hackathon 2026 · WDK Track (Tether)**

Caja convierte la wallet de un negocio en una caja registradora en USD₮:
**cobra** con QR y confirmación en vivo, **envía** remesas con tracking estilo
paquetería, y **delega** la operación a un agente AI que conecta al WDK a
través de MCP. Todo non-custodial, multi-chain, sin bancos.

> Demo: video de 3 min en `DEMO.md`.

---

## El problema

En LATAM, un negocio que quiere operar en USD₮ se encuentra con:

1. **Cobrar** — la wallet del negocio no es un punto de venta: no hay QR,
   no hay confirmación visual de que el pago llegó.
2. **Enviar** — enviar una remesa (proveedor, familia) es una transacción
   opaca: firmas, esperas, y no sabes si llegó.
3. **Operar** — gestionar la wallet exige tocar la línea de comandos o
   depender de herramientas fragmentadas.

## La solución

Una sola app con **una sola wallet** (creada por el WDK CLI) y tres vistas:

| Vista | Qué hace | Cómo |
|-------|----------|------|
| 💵 **Cobrar** | PDV cripto: monto → QR → el cliente paga → confirmación en vivo | Detector de pagos que verifica receipts on-chain cada 5s |
| 📦 **Enviar** | Remesas con tracking (enviado → confirmado → fallido) | `wdk send` + verificación de receipt en Sepolia |
| 🤖 **Agente** | Chat que opera la caja: saldo, envíos, con **confirmación humana** | `wdk-mcp` + DeepSeek (function calling) |
| 📱 **PWA** | Instalable: tu celular es tu terminal punto de venta | Manifest + Service Worker (offline shell) |

### Por qué el WDK es el core

Cada operación de wallet pasa por el **WDK CLI** como subprocess
(`wdk wallet`, `wdk get`, `wdk send`), y el agente AI conversa con la wallet
a través del **`wdk-mcp` server** (MCP Client en Node). El CLI es el core
building block de todo el sistema — literalmente cada request del frontend
termina en un comando `wdk`.

```
Frontend (Next.js) ──HTTP──▶ API (Express) ──subprocess──▶ wdk CLI
      │                              │
      │                              └─MCP client──────▶ wdk-mcp server
      └──── polling ────────────────▶ Detector de pagos (receipts Sepolia)
```

### 🔗 Integración WDK (permalinks)

| Archivo | Rol WDK |
|---------|---------|
| [`server/wdk.js`](https://github.com/macarenadevai/caja-usdt/blob/main/server/wdk.js) | Wrapper del **WDK CLI** como subprocess: `wallet unlock`, `get balance`, `get address`, `send --dry-run`, `send` (core) |
| [`server/agent.js`](https://github.com/macarenadevai/caja-usdt/blob/main/server/agent.js) | Cliente **MCP** → `wdk-mcp` server: el agente lee saldo y propone `send_token` con `dryRun=true` |
| [`server/payments.js`](https://github.com/macarenadevai/caja-usdt/blob/main/server/payments.js) | Detector de pagos: confirma receipts on-chain (Sepolia RPC) |
| [`server/package.json`](https://github.com/macarenadevai/caja-usdt/blob/main/server/package.json) | Dependencias WDK declaradas |
| [`scripts/ensayo.sh`](https://github.com/macarenadevai/caja-usdt/blob/main/scripts/ensayo.sh) | Prueba end-to-end: cobro → pago real → confirmación → ledger |

### 📦 Paquetes WDK instalados

| Paquete | Versión | Uso |
|---------|---------|-----|
| `@tetherto/wdk` | 1.0.0-beta.6 | Core del kit (SDK) |
| `@tetherto/wdk-cli` | 1.0.0-beta.2 | CLI con `wdk-mcp` bundled — subprocess core del server |
| `@tetherto/wdk-wallet-evm` | 1.0.0-beta.11 | Wallet EVM (Sepolia, USDT) |
| `@tetherto/wdk-wallet-evm-erc-4337` | 1.0.0-beta.6 | Módulo ERC-4337 (futuro gasless) |

> El agente usa el **`wdk-mcp` server** (bundled con el CLI) como bloque
> central: `connectMcp()` lo lanza como subprocess y expone sus tools
> (`get_balance`, `get_address`, `send_token`, …) al LLM vía MCP.

## Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS v4, TypeScript
- **Backend**: Node.js 22, Express 5
- **Wallet**: WDK CLI `@tetherto/wdk-cli@1.0.0-beta.2` (Tether)
- **Agente**: `wdk-mcp` (MCP server) + DeepSeek (function calling)
- **Red demo**: Sepolia (ETH + USDT mock)

## Cómo correr

### Prerequisitos

- Node.js ≥ 22.18 (requisito del WDK CLI)
- WDK CLI: `npm install -g --allow-scripts=@tetherto/wdk-cli @tetherto/wdk-cli@1.0.0-beta.2`

### 1. Crear la wallet del negocio

```bash
export WDK_PASSPHRASE="<tu-passphrase>"
wdk wallet create --name caja
wdk wallet default --name caja
```

### 2. Configurar el backend

```bash
cd server
cp .env.example .env
# edita .env: WDK_PASSPHRASE, DEEPSEEK_API_KEY, PORT=8788
npm install
node index.js
```

### 3. Levantar el frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

### 4. Fondear la caja (testnet)

En Sepolia, el USDT mock se obtiene de faucets (Candide / Pimlico).
Pide **USDT + ETH** a la dirección de la caja (`wdk get address --network sepolia`).

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/status` | Wallet, saldo, dirección |
| GET | `/api/balance?network=sepolia` | Saldo (native o token) |
| GET | `/api/address?network=sepolia` | Dirección de la caja |
| POST | `/api/invoice` `{amount}` | Crea un cobro (QR) |
| GET | `/api/invoice/:id` | Estado del cobro |
| POST | `/api/send` `{to, amount, confirm}` | Envía USDT (requiere confirmación) |
| GET | `/api/transfer/:id` | Estado del envío (tracking) |
| GET | `/api/transactions` | Ledger completo |
| POST | `/api/agent/message` `{text}` | Chat con el agente |
| POST | `/api/agent/confirm` `{proposalId}` | Confirma un envío propuesto |
| POST | `/api/agent/reject` `{proposalId}` | Rechaza/cancela una propuesta |

## Seguridad

- **Non-custodial**: el seed vive en la wallet del WDK CLI del negocio,
  protegido por passphrase (`WDK_PASSPHRASE` en `.env`, nunca en git).
- **El agente no ejecuta envíos sin confirmación humana**: `send_token`
  siempre pasa por `dryRun` → propuesta → el humano confirma.
- La passphrase y la API key están excluidas del repo (`.gitignore`).

## Decisiones técnicas clave

| Decisión | Opción elegida | Por qué |
|----------|---------------|---------|
| Core wallet | WDK CLI como subprocess | Prize 1: CLI como core building block; datos oficiales |
| Confirmación de pagos | Receipts on-chain (RPC Sepolia) | Estado real, no simulado |
| Detector de pagos | Eventos `Transfer` on-chain (`eth_getLogs`) | Matcheo por monto exacto; un fondeo no marca pagos falsos |
| Agente AI | MCP client → `wdk-mcp` + DeepSeek | Prize 1: MCP server como bloque central |
| Frontend | Next.js + Tailwind v4 (template ZTL) | Estética definida, build rápido |
| Almacenamiento | `state.json` atómico | Cero deps, suficiente para la demo |

## Estructura

```
aleph-hackathon/
├── SPEC.md            # Spec (SDD): user stories, plan, decisiones
├── DEMO.md            # Guion de la demo de 3 min
├── server/            # Backend Express + WDK
│   ├── wdk.js         # Wrapper del CLI (core)
│   ├── payments.js    # Detector de pagos + receipts
│   ├── agent.js       # MCP client + DeepSeek
│   ├── state.js       # Estado persistente
│   └── index.js       # API REST
└── frontend/          # Next.js 16
    ├── components/    # pdv.tsx, enviar.tsx, agente.tsx
    └── lib/api.ts     # Cliente API
```

## Licencia

MIT
