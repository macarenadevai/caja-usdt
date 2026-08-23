/**
 * agent.js — Quinto agent (Phase 5)
 *
 * Connects an MCP client to the wdk-mcp server (Tether) and an LLM (DeepSeek)
 * with function calling. The agent:
 *   - Reads balance/address/networks via MCP tools
 *   - To SEND: ALWAYS goes through a proposal (send_token dryRun=true),
 *     the user confirms, and only then it executes (dryRun=false).
 * TD-5: mandatory human confirmation before any send.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as state from "./state.js";
import { getAliasMap, listContacts, resolveAlias } from "./contacts.js";
import * as wdk from "./wdk.js";

const MCP_BIN = process.env.WDK_MCP_BIN || "/home/macarena/.hermes/node/bin/wdk-mcp";
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";
const MAX_LOOP = 6;

const SYSTEM_PROMPT = `You are "Quinto", the financial agent of a small business that operates with digital dollars (USD₮ on the Sepolia test network).

Your job: help the owner manage their cashbox using the available tools (balance, address, transfers, networks).

FRIENDLY LANGUAGE (mandatory, this is what makes the product feel "web2"):
- ALWAYS talk about "dollars": amounts are shown as "$10" or "10 dollars". NEVER use the word "USDT" in the chat (it's jargon the owner doesn't care about).
- NEVER show full wallet addresses in the chat. Use the aliases/contacts (full list below in CONTACTS) or, if the destination has no alias, refer to it as "the address you gave me" without writing it in full.
- The transfer proposal should look like: "Send $10.00 to <contact alias> (Sepolia network)". Zero jargon.
- Do NOT show the transaction hash as the main data: the platform generates a ticket-style receipt for the owner.

MANDATORY RULES:
1. To SEND money (send_token) ALWAYS use dryRun=true first. Never call send_token with dryRun=false on your own.
2. The owner approves or rejects the proposal; if they approve it, the platform will execute it.
3. Always respond in English, brief and clear.
4. If the balance is insufficient, say so honestly and suggest funding the cashbox.
5. To check how much you have, use get_balance with network=sepolia and token=usdt (testnet demo). Always present the balance as dollars.
6. If the owner mentions a contact by its alias (e.g. "pay López Hardware Store"), use that contact's address from the CONTACTS block.`;

/** Dynamic prompt: base prompt + the business's current contacts. */
function buildSystemPrompt() {
  const fixed = [
    { alias: "your cashbox", address: "0x5A6B8B635b6674681682dB4F713faF4001ac6Cb2" },
    { alias: "your test customer", address: "0x66dEc61c81105249fD38480157C37AcFb45A1a8b" },
    { alias: "your personal account", address: "0x9dabBF114698bd9bFBF6222b9FD6Cd967ECD3850" },
  ];
  const extra = listContacts();
  const lines = [...fixed, ...extra]
    .map((c) => `  • "${c.alias}" → ${c.address}`)
    .join("\n");
  return `${SYSTEM_PROMPT}

CONTACTS (addresses with aliases; use them when the owner asks to pay someone):
${lines}`;
}

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
    console.error("🤖 MCP connect failed:", e.message);
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

/** Runs an MCP tool and returns {text, isError}. Reconnects if the MCP died. */
async function callMcp(name, args) {
  if (!mcp) await connectMcp();
  try {
    const res = await mcp.callTool({ name, arguments: args });
    const content = res?.content || [];
    const text = content.map((c) => c.text || "").join("\n");
    return { text, isError: !!res?.isError };
  } catch (e) {
    // The MCP server (wdk-mcp) died or got cut off: reset and reconnect once.
    console.error(`🤖 MCP callTool(${name}) failed, reconnecting:`, e.message);
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
    { role: "system", content: buildSystemPrompt() },
    ...history.slice(-10),
    { role: "user", content: text },
  ];

  for (let i = 0; i < MAX_LOOP; i++) {
    const data = await deepSeek(messages, toFunctions());
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error("DeepSeek did not return a message");

    if (msg.tool_calls?.length) {
      // 1) send_token → PROPOSAL (always dryRun first)
      const sendCall = msg.tool_calls.find((tc) => tc.function.name === "send_token");
      if (sendCall) {
        let args;
        try {
          args = JSON.parse(sendCall.function.arguments || "{}");
        } catch {
          args = {};
        }
        // The WDK MCP server validates amount as STRING (schema says number — upstream bug)
        args.amount = String(args.amount ?? "");
        // If the LLM passed an alias/contact (e.g. "ferretería") instead of an address, resolve it
        if (!/^0x[0-9a-fA-F]{40}$/.test(args.to || "")) {
          const resolved = resolveAlias(args.to);
          if (resolved) args.to = resolved;
        }
        const preview = await callMcp("send_token", { ...args, dryRun: true });
        if (preview.isError) {
          messages.push({ role: "assistant", content: null, tool_calls: msg.tool_calls });
          messages.push({ role: "tool", tool_call_id: sendCall.id, content: preview.text });
          continue;
        }
        // Save the pending proposal (state.js saves top-level fields; the confirm
        // rebuilds the send_token args from them — don't rely on LLM args)
        const proposal = state.addProposal({
          text: friendlyText(`Send ${args.amount} ${args.token || "native"} to ${args.to} on ${args.network}`),
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
            ? (previewText.fee !== undefined ? ` · estimated fee: ${previewText.fee}` : "")
            : "";
        const reply = friendlyText(`📋 Transfer proposal:
${args.amount} ${args.token || "native"} → ${args.to}
Network: ${args.network}${feeLine}

Do you confirm the transfer? (Only executed with your confirmation)`);
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

  return { reply: "Sorry, I couldn't process that. Try again or rephrase your request." };
}

/**
 * Executes a proposal confirmed by the user.
 * @returns {Promise<{ok: boolean, message: string, transfer?: object}>}
 */
export async function confirmProposal(proposalId) {
  const proposal = state.getProposal(proposalId);
  if (!proposal) return { ok: false, message: "Proposal not found" };
  if (proposal.status !== "pending") return { ok: false, message: "Proposal already processed" };

  await connectMcp();
  // Build args from the proposal fields (robust: don't rely on LLM args)
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
    return { ok: false, message: `The transfer failed: ${res.text.slice(0, 200)}` };
  }

  state.setProposalStatus(proposalId, "confirmed");
  let out = res.text;
  try {
    out = JSON.parse(res.text);
  } catch {
    /* texto */
  }
  const txHash = typeof out === "object" ? out.txHash || out.hash || "" : "";

  // Register the transfer in the ledger for tracking
  const transfer = state.addTransfer({
    to: proposal.to,
    amount: Number(proposal.amount),
    token: proposal.token || "usdt",
    network: proposal.network || "sepolia",
    txHash: txHash || null,
  });

  return {
    ok: true,
    message: `✅ Transfer executed. Your receipt is below.`,
    transfer,
  };
}

/** Web2 layer: transforms model responses into friendly language. */
export function friendlyText(text = "") {
  let t = String(text);
  t = t.replace(/\bUSDT₮\b/gi, "dollars");
  t = t.replace(/\bUSDT\b/gi, "dollars");
  for (const [addr, alias] of Object.entries(getAliasMap())) {
    t = t.replace(new RegExp(addr, "gi"), alias);
  }
  // any remaining long address → short
  t = t.replace(/0x[0-9a-fA-F]{20,}/g, (m) => `${m.slice(0, 6)}…${m.slice(-4)}`);
  return t;
}

export default { connectMcp, processMessage, confirmProposal };
