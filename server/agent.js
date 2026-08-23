/**
 * agent.js — Agente de Quinto (Fase 5)
 *
 * Conecta un MCP client al wdk-mcp server (Tether) y un LLM (DeepSeek)
 * con function calling. El agente:
 *   - Lee balance/address/redes vía tools MCP
 *   - Para ENVIAR: SIEMPRE pasa por propuesta (send_token dryRun=true),
 *     el usuario confirma, y solo entonces ejecuta (dryRun=false).
 * TD-5: confirmación humana obligatoria antes de cualquier send.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as state from "./state.js";
import * as wdk from "./wdk.js";

const MCP_BIN = process.env.WDK_MCP_BIN || "/home/macarena/.hermes/node/bin/wdk-mcp";
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";
const MAX_LOOP = 6;

const SYSTEM_PROMPT = `Eres "Quinto", el agente financiero de un negocio pequeño que opera con dólares digitales (USD₮ en la red de prueba Sepolia).

Tu trabajo: ayudar al dueño a manejar su caja usando las herramientas disponibles (balance, dirección, envíos, redes).

LENGUAJE AMIGABLE (obligatorio, es lo que hace al producto "web2"):
- Habla SIEMPRE de "dólares": los montos se muestran como "$10" o "10 dólares". NUNCA uses la palabra "USDT" en el chat (es un tecnicismo que no le importa al dueño).
- NUNCA muestres direcciones de wallet completas en el chat. Usa estos alias:
  • "tu caja" → 0x5A6B8B635b6674681682dB4F713faF4001ac6Cb2
  • "tu cliente de prueba" → 0x66dEc61c81105249fD38480157C37AcFb45A1a8b
  • "tu cuenta personal" → 0x9dabBF114698bd9bFBF6222b9FD6Cd967ECD3850
  Si el destino no tiene alias, refiérete como "la dirección que me diste" sin escribirla completa.
- La propuesta de envío debe verse así: "Enviar $10.00 a tu cliente de prueba (red Sepolia)". Cero tecnicismos.
- El hash de la transacción NO lo muestres como dato principal: la plataforma genera un comprobante tipo ticket para el dueño.

REGLAS OBLIGATORIAS:
1. Para ENVIAR dinero (send_token) SIEMPRE usa dryRun=true primero. Nunca llames send_token con dryRun=false por tu cuenta.
2. El dueño aprueba o rechaza la propuesta; si la aprueba, la plataforma la ejecutará.
3. Responde siempre en español de México, breve y claro.
4. Si el saldo es insuficiente, dilo honestamente y sugiere fondear la caja.
5. Para ver cuánto tienes, usa get_balance con network=sepolia y token=usdt (demo en testnet). Recuerda presentar el saldo como dólares.`;

let mcp = null;
let toolDefs = [];

/** Conecta (y reconecta) el MCP client al wdk-mcp. */
export async function connectMcp() {
  if (mcp) return mcp;
  const transport = new StdioClientTransport({
    command: MCP_BIN,
    args: [],
    env: {
      ...process.env,
      WDK_PASSPHRASE: process.env.WDK_PASSPHRASE || "",
    },
    stderr: "pipe",
  });
  const client = new Client({ name: "quinto-agent", version: "1.0.0" });
  try {
    await client.connect(transport);
  } catch (e) {
    console.error("🤖 MCP connect falló:", e.message);
    transport.close?.().catch(() => {});
    throw e;
  }
  const { tools } = await client.listTools();
  toolDefs = tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));
  mcp = client;
  console.log(`🤖 Agente conectado a wdk-mcp (${toolDefs.length} tools: ${toolDefs.map((t) => t.name).join(", ")})`);
  return mcp;
}

/** Ejecuta una tool del MCP y devuelve {text, isError}. Reconecta si el MCP murió. */
async function callMcp(name, args) {
  if (!mcp) await connectMcp();
  try {
    const res = await mcp.callTool({ name, arguments: args });
    const content = res?.content || [];
    const text = content.map((c) => c.text || "").join("\n");
    return { text, isError: !!res?.isError };
  } catch (e) {
    // El server MCP (wdk-mcp) murió o se cortó: resetear y reconectar una vez.
    console.error(`🤖 MCP callTool(${name}) falló, reconectando:`, e.message);
    mcp = null;
    await connectMcp();
    const res = await mcp.callTool({ name, arguments: args });
    const content = res?.content || [];
    const text = content.map((c) => c.text || "").join("\n");
    return { text, isError: !!res?.isError };
  }
}

/** Function schemas estilo OpenAI/DeepSeek a partir de las tools MCP. */
function toFunctions() {
  return toolDefs.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));
}

async function deepSeek(messages, functions) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY no configurada en server/.env");
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, messages, tools: functions, tool_choice: "auto" }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`DeepSeek HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  } finally {
    clearTimeout(to);
  }
}

/**
 * Procesa un mensaje del usuario.
 * @returns {Promise<{reply: string, proposal?: object}>}
 */
export async function processMessage(text, history = []) {
  await connectMcp();
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-10),
    { role: "user", content: text },
  ];

  for (let i = 0; i < MAX_LOOP; i++) {
    const data = await deepSeek(messages, toFunctions());
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error("DeepSeek no devolvió mensaje");

    if (msg.tool_calls?.length) {
      // 1) send_token → PROPUESTA (siempre dryRun primero)
      const sendCall = msg.tool_calls.find((tc) => tc.function.name === "send_token");
      if (sendCall) {
        let args;
        try {
          args = JSON.parse(sendCall.function.arguments || "{}");
        } catch {
          args = {};
        }
        // El MCP server de WDK valida amount como STRING (el schema dice number — bug upstream)
        args.amount = String(args.amount ?? "");
        const preview = await callMcp("send_token", { ...args, dryRun: true });
        if (preview.isError) {
          messages.push({ role: "assistant", content: null, tool_calls: msg.tool_calls });
          messages.push({ role: "tool", tool_call_id: sendCall.id, content: preview.text });
          continue;
        }
        // Guardar la propuesta pendiente (state.js guarda campos top-level; el confirm
        // reconstruye los args del send_token desde ellos — no depender de args del LLM)
        const proposal = state.addProposal({
          text: friendlyText(`Enviar ${args.amount} ${args.token || "nativo"} a ${args.to} en ${args.network}`),
          to: args.to,
          amount: args.amount,
          token: args.token,
          network: args.network,
        });
        let previewText = preview.text;
        try {
          previewText = JSON.parse(preview.text);
        } catch {
          /* texto plano */
        }
        const feeLine =
          previewText && typeof previewText === "object"
            ? (previewText.fee !== undefined ? ` · fee estimado: ${previewText.fee}` : "")
            : "";
        const reply = friendlyText(`📋 Propuesta de envío:
${args.amount} ${args.token || "nativo"} → ${args.to}
Red: ${args.network}${feeLine}

¿Confirmas el envío? (Solo se ejecuta con tu confirmación)`);
        return { reply, proposal: { id: proposal.id, ...proposal } };
      }

      // 2) Otras tools → ejecutar directo y continuar el loop
      const results = [];
      for (const tc of msg.tool_calls) {
        let args;
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          args = {};
        }
        const r = await callMcp(tc.function.name, args);
        results.push({ tool_call_id: tc.id, content: r.text, isError: r.isError });
      }
      messages.push({ role: "assistant", content: msg.content, tool_calls: msg.tool_calls });
      for (const r of results) {
        messages.push({ role: "tool", tool_call_id: r.tool_call_id, content: r.content });
      }
      continue;
    }

    return { reply: friendlyText(msg.content) };
  }

  return { reply: "Lo siento, no pude procesar eso. Inténtalo de nuevo o reformula la petición." };
}

/**
 * Ejecuta una propuesta confirmada por el usuario.
 * @returns {Promise<{ok: boolean, message: string, transfer?: object}>}
 */
export async function confirmProposal(proposalId) {
  const proposal = state.getProposal(proposalId);
  if (!proposal) return { ok: false, message: "Propuesta no encontrada" };
  if (proposal.status !== "pending") return { ok: false, message: "Propuesta ya procesada" };

  await connectMcp();
  // Construir args desde los campos de la propuesta (robusto: no depender de args del LLM)
  const args = {
    network: proposal.network,
    token: proposal.token || "usdt",
    to: proposal.to,
    amount: String(proposal.amount),
    dryRun: false,
  };
  const res = await callMcp("send_token", args);
  if (res.isError) {
    state.setProposalStatus(proposalId, "cancelled");
    return { ok: false, message: `El envío falló: ${res.text.slice(0, 200)}` };
  }

  state.setProposalStatus(proposalId, "confirmed");
  let out = res.text;
  try {
    out = JSON.parse(res.text);
  } catch {
    /* texto */
  }
  const txHash = typeof out === "object" ? out.txHash || out.hash || "" : "";

  // Registrar el envío en el ledger para el tracking
  const transfer = state.addTransfer({
    to: proposal.to,
    amount: Number(proposal.amount),
    token: proposal.token || "usdt",
    network: proposal.network || "sepolia",
    txHash: txHash || null,
  });

  return {
    ok: true,
    message: `✅ Envío ejecutado. Te muestro tu comprobante abajo.`,
    transfer,
  };
}

const ALIASES = {
  "0x5a6b8b635b6674681682db4f713faf4001ac6cb2": "tu caja",
  "0x66dec61c81105249fd38480157c37acfb45a1a8b": "tu cliente",
  "0x9dabbf114698bd9bfbf6222b9fd6cd967ecd3850": "tu cuenta personal",
};

/** Capa web2: transforma respuestas del modelo a lenguaje amigable. */
export function friendlyText(text = "") {
  let t = String(text);
  t = t.replace(/\bUSDT₮\b/gi, "dólares");
  t = t.replace(/\bUSDT\b/gi, "dólares");
  for (const [addr, alias] of Object.entries(ALIASES)) {
    t = t.replace(new RegExp(addr, "gi"), alias);
  }
  // cualquier dirección larga restante → corta
  t = t.replace(/0x[0-9a-fA-F]{20,}/g, (m) => `${m.slice(0, 6)}…${m.slice(-4)}`);
  return t;
}

export default { connectMcp, processMessage, confirmProposal };
