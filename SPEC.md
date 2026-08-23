# SPEC — "Quinto" · Aleph Hackathon 2026 (WDK Track)

**Working name**: Quinto — tu negocio en USD₮
**Evento**: Aleph Hackathon 6ª edición · WDK Track (Tether)
**Timeline**: 22 ago 12:00 → 23 ago 12:00 ARG · quedan ~18h al momento del spec
**Status**: Draft v1.0 — para aprobación de Richi

---

## 1. Constitution (principios del proyecto)

1. **El CLI de WDK es el core building block** — toda operación de wallet pasa por `wdk` (subprocess). Es el requisito literal del prize 1: "Best project built with the WDK CLI (and/or its bundled MCP server)".
2. **Funcionalidad > estética** — la UI debe verse premium, pero cada pixel se justifica con una función de la demo.
3. **Scope disciplinado** — 3 vistas (Cobrar, Enviar, Agente) que comparten UNA columna vertebral: wallet WDK + detector de pagos. Nada más entra sin justificación.
4. **El agente es un lujo, no una dependencia** — Cobrar y Enviar funcionan 100% sin agente. Si el LLM falla en la demo, el resto sigue vivo.
5. **Zero secretos en git** — seed, passphrase y API keys viven en `.env` (gitignored).
6. **Todo el código se escribe ahora** — regla del hackathon: el código del proyecto se commitea después del inicio oficial (ya empezó). El template-evm es scaffold propio, permitido como base.

## 2. Concepto

Un negocio (tienda, freelance, remesa) que maneja su **caja en USD₮** con una sola app:

- **Cobrar** — terminal PDV: metes el monto, sale un QR, el cliente paga, la pantalla confirma en vivo.
- **Enviar** — remesa/pago a proveedor o familia con tracking estilo paquetería (*enviado → confirmado → listo*).
- **Agente** — le escribes al chat "págale $10 a mi proveedor" y un agente AI (DeepSeek + wdk-mcp) prepara la operación; tú la confirmas y se ejecuta.

Todo sobre la wallet non-custodial del negocio, generada por el WDK CLI. Demo en Sepolia con USD₮ mock (faucets Pimlico/Candide) + wallet pagador local para la demo.

## 3. Stack

| Capa | Tecnología | Fuente |
|---|---|---|
| Frontend | Next.js 16.3 + React 19.2 + TS 5 + Tailwind 4 + shadcn/ui + lucide | template-evm (frontend/) |
| Backend | Node 22.22 + Express 5 — API REST localhost:8788 | nueva carpeta server/ |
| Wallet core | WDK CLI v1.0.0-beta.2 (wdk / wdk-daemon / wdk-mcp) | npm global @tetherto/wdk-cli |
| Agente | DeepSeek (function calling) + MCP client SDK → wdk-mcp | server/agent.js |
| Datos | state.json (invoices, envíos, ledger) — cero deps | server/data/ |
| Red demo | Sepolia (USD₮ mock 0xd077A4...) | wdk network/token |

## 4. User Stories

### US-1 — Cobrar en la caja (P1)

El dueño del negocio cobra a un cliente con cripto sin terminal bancaria: escribe el monto, muestra un QR con la dirección y el monto, y cuando el cliente paga la pantalla confirma en vivo.

**Por qué P1**: es la primera mitad de la demo y el caso más tangible (PayKit en miniatura).

**Test independiente**: creando una invoice y pagándola con la wallet pagador local, el estado debe pasar a *pagada* sin intervención manual.

**Acceptance scenarios**:
1. **Given** una caja con wallet WDK en Sepolia, **When** el dueño ingresa un monto y crea la invoice, **Then** se genera un QR con address + monto y la invoice queda en estado *pendiente*.
2. **Given** una invoice *pendiente*, **When** la wallet pagador envía USD₮ mock a la dirección (fuera de la app), **Then** el detector (poll ≤5s) actualiza la invoice a *pagada* y la UI lo muestra con confirmación visual.
3. **Given** una invoice pagada, **When** se abre el detalle, **Then** se muestra monto, dirección, tx hash (si está disponible) y hora.

### US-2 — Enviar con tracking (P1)

El dueño envía USD₮ a un proveedor o familiar y ve el progreso como un envío de paquetería.

**Por qué P1**: segunda mitad de la demo — el lado "remesas con tracking".

**Test independiente**: enviando un monto de la caja a una segunda wallet, el estado avanza de *enviado* a *confirmado* automáticamente.

**Acceptance scenarios**:
1. **Given** una caja con saldo, **When** el dueño envía `{monto, dirección}` y confirma, **Then** el backend ejecuta `wdk send` y la operación entra en estado *enviado* con su tx hash.
2. **Given** una operación *enviada*, **When** la tx alcanza confirmación en Sepolia, **Then** el estado cambia a *confirmado* y el tracking muestra el paso completado.
3. **Given** un monto sin saldo suficiente, **When** se intenta enviar, **Then** la UI bloquea con error claro ("saldo insuficiente") sin llamar al CLI.

### US-3 — Agente de caja (P1)

El dueño opera la caja en lenguaje natural: "¿cuánto tengo?", "págale $10 a 0x123..." — el agente traduce a operaciones reales de wallet vía wdk-mcp, propone, el dueño confirma, se ejecuta.

**Por qué P1**: es el diferenciador del prize 1 (agentes con wallets vía CLI/MCP) y lo que casi nadie más va a intentar a este nivel.

**Test independiente**: preguntando el balance al chat, el agente responde el número real de la wallet; pidiendo un envío, genera una propuesta que requiere confirmación.

**Acceptance scenarios**:
1. **Given** el chat abierto, **When** el dueño pregunta "¿cuánto USD₮ tengo?", **Then** el agente consulta wdk-mcp y responde el balance real (no inventado).
2. **Given** la instrucción "envía $10 a 0x...", **When** el agente interpreta, **Then** muestra una propuesta `{to, amount, token, network, fee}` y NO ejecuta sin confirmación.
3. **Given** una propuesta visible, **When** el dueño la confirma, **Then** se ejecuta `wdk send` y el resultado aparece en el chat y en el ledger.
4. **Given** una instrucción ambigua o sin fondos, **When** el agente procesa, **Then** responde pidiendo aclaración o reportando saldo insuficiente — nunca inventa una ejecución.

### US-4 — Ledger de operaciones (P2)

Toda operación (cobros y envíos) queda en un historial con estado, hora y montos.

**Por qué P2**: refuerza el pitch ("tu caja ordenada") pero no bloquea la demo.

**Acceptance scenarios**:
1. **Given** N operaciones, **When** se abre el ledger, **Then** se listan ordenadas por fecha con estado y monto.
2. **Given** una operación, **When** se filtra por estado, **Then** solo aparecen las que corresponden.

### US-5 — Multi-red (P2)

Selector de red para operar (Sepolia en demo; ethereum, solana, tron, base reales disponibles por el CLI).

**Por qué P2**: el WDK es multi-chain por diseño; mostrarlo suma puntos, pero la demo puede vivir en Sepolia.

**Acceptance scenarios**:
1. **Given** el selector de red, **When** se cambia de red, **Then** balances e invoices usan esa red.
2. **Given** una red sin USDT registrado, **When** se intenta cobrar, **Then** la UI lo advierte y bloquea el token.

### US-6 — Gasless con smart account (P2, si el tiempo alcanza)

Usar el smart account ERC-4337 derivado por WDK para que el pagador no necesite ETH de gas (prize 2: $500).

**Por qué P2**: es el prize 2 completo, pero requiere bundler/paymaster config (riesgo de tiempo).

**Acceptance scenarios**:
1. **Given** un smart account desplegado, **When** el cliente paga sin ETH nativo, **Then** la tx se ejecuta vía paymaster.
2. **Given** config gasless ausente, **When** se intenta usar, **Then** la app lo reporta sin romper el resto.

## 5. Functional Requirements

- **FR-001**: Backend expone API REST en `localhost:8788` (CORS para el front).
- **FR-002**: Toda operación de wallet pasa por el CLI `wdk` como subprocess con `WDK_PASSPHRASE` del `.env` (nunca en argv visible).
- **FR-003**: Detector de pagos: poll cada 5s de `wdk get balance --network sepolia --token usdt` (y `--token eth` para gas); invoice se marca *pagada* cuando el balance del address supera el monto esperado.
- **FR-004**: Modelo Invoice: `{id, amount, token, network, address, status: pending|paid|expired, createdAt, paidAt}`.
- **FR-005**: Modelo Transfer: `{id, to, amount, token, network, status: pending|sent|confirmed|failed, txHash, createdAt, confirmedAt}`.
- **FR-006**: Agente: chat → DeepSeek (function calling) → tools del wdk-mcp; cualquier `send` requiere propuesta + confirmación humana.
- **FR-007**: Front: una sola página dashboard con 3 pestañas (Cobrar / Enviar / Agente) + ledger; polling de estado cada 3s.
- **FR-008**: Secretos (WDK_PASSPHRASE, DEEPSEEK_API_KEY) SOLO en `.env` (gitignored). `.env.example` con placeholders commiteado.
- **FR-009**: Build limpio de frontend (`npm run build`) y backend arrancable con `npm start`.
- **FR-010**: README.md del repo: qué es, cómo correrlo, stack, video demo.

## 6. API Contracts

```
GET  /api/status                 → {wallet, defaultNetwork, networks[], tokens[]}
GET  /api/balance?network=&token → {network, token, formatted, usd}
GET  /api/address?network=       → {network, address}
POST /api/invoice {amount, token, network}
                                 → {id, amount, token, address, qrPayload, status}
GET  /api/invoice/:id            → {id, amount, token, status, paidAt}
POST /api/send {to, amount, token, network, confirm:true}
                                 → {id, status:'sent', txHash} | {error}
GET  /api/transactions           → [{type:'invoice'|'send', id, amount, status, createdAt}]
POST /api/agent/message {text}   → {reply, proposal?{id, to, amount, token, fee}, needsConfirmation}
POST /api/agent/confirm {proposalId}
                                 → {result, txHash?}
GET  /api/agent/proposals        → [proposal...]
```

Errores: `{error: string, code: string}` con HTTP 400/404/409/500.

## 7. Technical Decisions

| # | Decisión | Opciones | Elegida | Razón |
|---|---|---|---|---|
| TD-1 | Integración WDK | SDK Node directo vs **CLI subprocess** | CLI subprocess | Prize 1 literal: "built with the WDK CLI as core building block". Misma data, defensible ante jueces. |
| TD-2 | Persistencia | SQLite vs JSON | state.json | Cero deps nativas, suficiente para demo; lectura/escritura con lock simple. |
| TD-3 | Frontend wallet | Mantener Reown AppKit vs **quitar** | Quitar AppKit/Wagmi/x402 | El pagador usa su propia wallet (escaneo QR / wallet CLI local). Menos deps = menos riesgo de build. viem se queda solo si el backend lo necesita (no: el CLI cubre). |
| TD-4 | Detector de pagos | Indexer/history vs **polling balance** | Polling `wdk get balance --token usdt` 5s | Oficial, sin API key de indexer (history requiere indexer key). Latencia 5s aceptable para demo. |
| TD-5 | Pagador demo | MetaMask + faucets vs **wallet WDK local** | Wallet local `pagador` (wdk wallet create) | Cero dependencia de extensiones/faucets en vivo; mismo mecanismo real (send → dirección de la caja). |
| TD-6 | Agente | Claude Desktop vs **MCP client custom + DeepSeek** | MCP client SDK (@modelcontextprotocol/sdk) + DeepSeek | DeepSeek soporta function calling; wdk-mcp es stdio server agnóstico. No depender de Claude. |
| TD-7 | Seguridad agente | Ejecución directa vs **confirmación humana** | Propuesta + confirmación | Demo honesta y segura: el agente propone, el humano ejecuta. Evita "el AI inventó un envío". |
| TD-8 | Red demo | ethereum mainnet vs **sepolia** | Sepolia | USD₮ mock con faucets (Pimlico/Candide), gas de faucet. El CLI ya la tiene con token registrado. |
| TD-9 | Unlock daemon | Manual vs **por comando** | Wrapper re-unlock con WDK_PASSPHRASE por operación | El daemon tiene TTL (~5 min); el wrapper garantiza unlock siempre. |
| TD-10 | Backend framework | Express vs Fastify vs Hono | Express 5 | Ligero, conocido, ecosistema estable. |
| TD-11 | Node | 22.22.2 (server) vs instalar 24 | 22.22.2 | WDK exige 22.18+ ✓. Next 16 requiere ≥20.9 ✓. Si el build de Next falla por Node 22, instalar Node 24 (contingencia). |

## 8. Plan por Fases (tasks con archivos)

### Fase 0 — Setup (45 min) · Setup
1. Limpiar template: borrar `backend/` (Hardhat no se usa), quitar deps AppKit/Wagmi/x402 de `frontend/package.json`, actualizar `frontend/app/layout.tsx` (quitar AppKitProvider) y `frontend/config/appkit.ts`/`chains.ts`.
2. Crear `server/` (package.json, express 5) + `.env` + `.env.example`.
3. Wallet de la caja: `WDK_PASSPHRASE=... wdk wallet create --name caja` + `wdk wallet default --name caja` (seed en `.env`).
4. Wallet pagador demo: `wdk wallet create --name pagador`.
5. Verificar: `wdk get balance --network sepolia --token usdt` (**validado en spike 22-ago: devuelve USDT + address**) y `npm run build` del front limpio.
6. Git init/remote repo del hackathon; primer commit del scaffold limpio.

### Fase 1 — Backend core (2-3h) · Foundational (bloquea US-1..US-3)
- `server/wdk.js` — wrapper subprocess: `execWdk(args)`, re-unlock, parse JSON, errores tipados.
- `server/state.js` — carga/guarda state.json (invoices, transfers, proposals, ledger).
- `server/index.js` — Express, CORS, rutas: status, balance, address, send, transactions.
- `server/data/state.json` — seed de estado vacío.

### Fase 2 — Detector de pagos + invoices (1-2h) · US-1
- `server/payments.js` — poll 5s: balances → actualiza invoices *pending→paid* + registra en ledger.
- `server/index.js` — rutas invoice (create, get).

### Fase 3 — Front: Cobrar (2-3h) · US-1
- `frontend/app/page.tsx` — dashboard con tabs (shadcn Tabs).
- `frontend/app/globals.css` — theme ZTL (accent #00FFAA, bg #0A0A0A, surface #111111).
- `frontend/components/PdvPanel.tsx` — input monto, QR (lib: `qrcode.react` o canvas manual), estado en vivo.
- `frontend/lib/api.ts` — cliente fetch del backend.
- `frontend/hooks/usePolling.ts` — poll 3s.

### Fase 4 — Front: Enviar + tracking (1.5-2h) · US-2
- `frontend/components/SendPanel.tsx` — form monto+destino, confirmación, tracking stepper (enviado→confirmado).
- `frontend/components/TrackingStepper.tsx` — stepper visual reutilizable.

### Fase 5 — Agente (2-3h) · US-3
- `server/agent.js` — MCP client (@modelcontextprotocol/sdk) → wdk-mcp (subprocess stdio); DeepSeek function calling; proposals en state.
- `server/index.js` — rutas agent (message, confirm, proposals).
- `frontend/components/AgentPanel.tsx` — chat UI + tarjetas de propuesta (confirmar/cancelar).

### Fase 6 — Pulido + demo (2-3h) · Polish
- Micro-interacciones: confetti al cobrar (lucide/canvas), estados animados, empty states.
- Ledger visual (US-4) en dashboard.
- README.md completo + `.env.example`.
- Repo público GitHub + video demo 3 min (guion abajo).
- Validación final: `npm run build`, flujo completo end-to-end, `git status` sin secretos.

### Contingencia (orden de corte si aprieta el tiempo)
1. ~~US-6 gasless~~ (siempre último)
2. ~~US-5 multi-red~~ (demo vive en Sepolia)
3. ~~US-4 ledger~~ (el estado igual se registra, solo se corta la vista)
4. **Agente degradado**: si DeepSeek/wdk-mcp falla, el chat queda como "modo manual" (comandos /balance /send) — la demo sigue completa.
5. **Front degradado**: si Next 16 se atora en el build, un solo HTML estático + JS vanilla sobre el mismo backend (el backend manda).

## 9. Riesgos

| Riesgo | Prob | Impacto | Mitigación |
|---|---|---|---|
| Next 16 + Node 22 incompatibles en build | baja | alto | Verificar en Fase 0; instalar Node 24 (nvm) si falla |
| `wdk get balance --token usdt` — **RESUELTO 22-ago** (validado en spike) | — | — | — |
| wdk-mcp no expone tools suficientes / protocolo | media | medio | Fase 5 temprana; fallback: las tools del agente llaman al wrapper `wdk.js` directo (misma funcionalidad, el MCP queda como integración secundaria) |
| DeepSeek sin saldo/API key | baja | medio | Usar la key de Hermes existente; fallback manual (contigencia 4) |
| Faucet Sepolia no entrega mock USDT | baja | bajo | Wallet pagador local recibe de una wallet "fondeadora" (faucet hecho a mano con wdk send entre wallets propias) |
| Scope creep en UI | media | alto | Constitution #3: nada sin justificación de demo |

## 10. Guion Demo (video 3 min)

1. **Hook (15s)**: "Tu negocio cobra y paga en USD₮ sin banco, y un agente AI lo opera. Esto es Quinto." + pantalla dashboard.
2. **Cobrar (60s)**: monto $25 → QR → pago desde la wallet pagador → confetti + invoice *pagada*.
3. **Agente (60s)**: "¿cuánto tengo?" → balance real → "págale $10 a 0x..." → propuesta → confirmar → ejecuta.
4. **Tracking (30s)**: el envío en el ledger con stepper *enviado → confirmado*.
5. **Cierre (15s)**: "Quinto corre sobre el WDK CLI de Tether — non-custodial, multi-chain, sin contratos. Código abierto en GitHub."

**Nota**: el video puede ser en español (juicio bilingüe). Cámara alta, una sola ventana, sin edición compleja — el flujo se cuenta solo.

---

*Spec v1.0 — para revisión de Richi. Fases 0-2 = ~6h · Fases 3-4 = ~4h · Fase 5 = ~3h · Fase 6 = ~3h · Total ~16h, deja margen sobre las ~18h disponibles.*
