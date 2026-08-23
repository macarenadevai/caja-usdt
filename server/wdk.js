/**
 * wdk.js — Wrapper del WDK CLI (Tether)
 *
 * Every wallet operation goes through the `wdk` CLI as a subprocess
 * (TD-1: "WDK CLI as core building block" — prize 1 del hackathon).
 *
 * - WDK_PASSPHRASE is injected via env (never in visible argv)
 * - El daemon tiene TTL de unlock (~5 min) → re-unlock idempotente antes de operar
 * - JSON output parsed; errors typed with the CLI code
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const execFileP = promisify(execFile);

// Binary path: explicit WDK_BIN, otherwise Hermes' global npm install
const WDK_BIN =
  process.env.WDK_BIN || "/home/macarena/.hermes/node/bin/wdk";

export const WALLET = process.env.CAJA_WALLET || "caja";
export const DEFAULT_NETWORK = process.env.NETWORK || "sepolia";
// WARNING: name WITHOUT "TOKEN" — dotenv v17 masks variables whose name
// contains TOKEN/KEY/SECRET and rewrites the redacted .env (corrupts runtime).
// Ver skill research/engram-patterns-adoption → pitfall dotenv v17.
export const DEFAULT_TOKEN = process.env.DEFAULT_TKN || "usdt";

/**
 * Ejecuta un comando wdk y devuelve el JSON parseado.
 * @param {string[]} args — args del CLI (sin "wdk")
 * @param {{wallet?: string}} opts
 */
export async function execWdk(args, opts = {}) {
  const wallet = opts.wallet || WALLET;
  const fullArgs = [...args];
  // El flag difiere por comando: wallet unlock/default usan --name; get/send usan --wallet; list no usa ninguno
  if (args[0] === "wallet" && args[1] !== "list") {
    if (!fullArgs.includes("--name")) fullArgs.push("--name", wallet);
  } else if (args[0] === "get" || args[0] === "send") {
    if (!fullArgs.includes("--wallet")) fullArgs.push("--wallet", wallet);
  }
  fullArgs.push("--json");

  const env = {
    ...process.env,
    WDK_PASSPHRASE: process.env.WDK_PASSPHRASE || "",
  };

  let stdout = "";
  let stderr = "";
  try {
    const res = await execFileP(WDK_BIN, fullArgs, {
      env,
      timeout: 60_000,
    });
    stdout = res.stdout;
    stderr = res.stderr;
  } catch (e) {
    stdout = e.stdout || "";
    stderr = e.stderr || "";
    // El CLI imprime el error como JSON en stdout cuando falla con --json
    const last = stdout.trim().split("\n").filter(Boolean).at(-1) || "";
    let cliMsg = "";
    try {
      const parsed = JSON.parse(last);
      cliMsg = parsed?.error || "";
    } catch {
      cliMsg = "";
    }
    const detail = cliMsg || stderr.split("\n").filter(Boolean).slice(-3).join(" | ");
    const err = new Error(detail || `wdk ${args.join(" ")} failed`);
    err.code = e.code || "WDK_EXEC_ERROR";
    err.cliError = cliMsg;
    err.stderr = stderr;
    throw err;
  }

  // El CLI imprime notas por stderr (ej. "using passphrase from env"); ignorar.
  const lastLine = stdout.trim().split("\n").filter(Boolean).at(-1) || "";
  try {
    return JSON.parse(lastLine);
  } catch {
    const err = new Error(`WDK returned no JSON: ${fullArgs.join(" ")}`);
    err.code = "WDK_PARSE_ERROR";
    err.stdout = stdout;
    err.stderr = stderr;
    throw err;
  }
}

// Cache del unlock: el daemon de wdk mantiene la wallet desbloqueada ~5 min.
// Avoids a `wallet unlock` per operation (balance + send + detector…).
const UNLOCK_TTL_MS = 60_000;
const unlockCache = new Map(); // wallet -> timestamp

/** Ensures the wallet is unlocked in the daemon (idempotent + cached). */
export async function ensureUnlocked(wallet = WALLET) {
  const last = unlockCache.get(wallet) || 0;
  if (Date.now() - last < UNLOCK_TTL_MS) return { cached: true };
  const res = await execWdk(["wallet", "unlock"], { wallet });
  unlockCache.set(wallet, Date.now());
  return res;
}

/** Balance of a token on a network. */
export async function getBalance({ network = DEFAULT_NETWORK, token = DEFAULT_TOKEN, wallet = WALLET } = {}) {
  await ensureUnlocked(wallet);
  const args = ["get", "balance", "--network", network];
  if (token) args.push("--token", token);
  const res = await execWdk(args, { wallet });
  return res;
}

/** Address derived from the wallet on a network. */
export async function getAddress({ network = DEFAULT_NETWORK, wallet = WALLET } = {}) {
  await ensureUnlocked(wallet);
  return execWdk(["get", "address", "--network", network], { wallet });
}

/** Addresses of ALL networks (for status). */
export async function getAllAddresses({ wallet = WALLET } = {}) {
  await ensureUnlocked(wallet);
  return execWdk(["get", "address", "--all"], { wallet });
}

/** Wallet info (name, default, unlocked). */
export async function getWallets() {
  return execWdk(["wallet", "list"]);
}

/**
 * Estimates a transfer without executing it (--dry-run). Returns the estimate or throws.
 */
export async function estimateSend({ to, amount, token = DEFAULT_TOKEN, network = DEFAULT_NETWORK, wallet = WALLET }) {
  await ensureUnlocked(wallet);
  const args = ["send", "--network", network, "--to", to, "--amount", String(amount)];
  if (token) args.push("--token", token);
  args.push("--dry-run");
  return execWdk(args, { wallet });
}

/**
 * Executes a real transfer. Returns the CLI response (tx hash, etc.).
 */
export async function sendTokens({ to, amount, token = DEFAULT_TOKEN, network = DEFAULT_NETWORK, wallet = WALLET }) {
  await ensureUnlocked(wallet);
  const args = ["send", "--network", network, "--to", to, "--amount", String(amount)];
  if (token) args.push("--token", token);
  return execWdk(args, { wallet });
}

/** List of available networks (name, network, type, testnet). */
export async function listNetworks() {
  return execWdk(["network", "list"]);
}

/** List of registered tokens per network. */
export async function listTokens(network = DEFAULT_NETWORK) {
  return execWdk(["token", "list", "--network", network]);
}

export default {
  execWdk,
  ensureUnlocked,
  getBalance,
  getAddress,
  getAllAddresses,
  getWallets,
  estimateSend,
  sendTokens,
  listNetworks,
  listTokens,
  WALLET,
  DEFAULT_NETWORK,
  DEFAULT_TOKEN,
};
