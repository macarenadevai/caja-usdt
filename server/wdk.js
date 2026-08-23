/**
 * wdk.js — Wrapper del WDK CLI (Tether)
 *
 * Toda operación de wallet pasa por el CLI `wdk` como subprocess
 * (TD-1: "WDK CLI as core building block" — prize 1 del hackathon).
 *
 * - WDK_PASSPHRASE se inyecta vía env (nunca en argv visible)
 * - El daemon tiene TTL de unlock (~5 min) → re-unlock idempotente antes de operar
 * - Salida JSON parseada; errores tipados con código del CLI
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const execFileP = promisify(execFile);

// Ruta del binario: WDK_BIN explícito, si no, el instalado por npm global de Hermes
const WDK_BIN =
  process.env.WDK_BIN || "/home/macarena/.hermes/node/bin/wdk";

export const WALLET = process.env.CAJA_WALLET || "caja";
export const DEFAULT_NETWORK = process.env.NETWORK || "sepolia";
// OJO: nombre SIN "TOKEN" — dotenv v17 enmascara variables cuyo nombre
// contiene TOKEN/KEY/SECRET y reescribe el .env redactado (corrompe runtime).
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
    const err = new Error(detail || `wdk ${args.join(" ")} falló`);
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
    const err = new Error(`WDK no devolvió JSON: ${fullArgs.join(" ")}`);
    err.code = "WDK_PARSE_ERROR";
    err.stdout = stdout;
    err.stderr = stderr;
    throw err;
  }
}

// Cache del unlock: el daemon de wdk mantiene la wallet desbloqueada ~5 min.
// Evita un `wallet unlock` por cada operación (balance + send + detector…).
const UNLOCK_TTL_MS = 60_000;
const unlockCache = new Map(); // wallet -> timestamp

/** Asegura que la wallet esté desbloqueada en el daemon (idempotente + cacheado). */
export async function ensureUnlocked(wallet = WALLET) {
  const last = unlockCache.get(wallet) || 0;
  if (Date.now() - last < UNLOCK_TTL_MS) return { cached: true };
  const res = await execWdk(["wallet", "unlock"], { wallet });
  unlockCache.set(wallet, Date.now());
  return res;
}

/** Balance de un token en una red. */
export async function getBalance({ network = DEFAULT_NETWORK, token = DEFAULT_TOKEN, wallet = WALLET } = {}) {
  await ensureUnlocked(wallet);
  const args = ["get", "balance", "--network", network];
  if (token) args.push("--token", token);
  const res = await execWdk(args, { wallet });
  return res;
}

/** Dirección derivada de la wallet en una red. */
export async function getAddress({ network = DEFAULT_NETWORK, wallet = WALLET } = {}) {
  await ensureUnlocked(wallet);
  return execWdk(["get", "address", "--network", network], { wallet });
}

/** Direcciones de TODAS las redes (para el status). */
export async function getAllAddresses({ wallet = WALLET } = {}) {
  await ensureUnlocked(wallet);
  return execWdk(["get", "address", "--all"], { wallet });
}

/** Información de la wallet (nombre, default, unlocked). */
export async function getWallets() {
  return execWdk(["wallet", "list"]);
}

/**
 * Estima un envío sin ejecutarlo (--dry-run). Devuelve la estimación o lanza error.
 */
export async function estimateSend({ to, amount, token = DEFAULT_TOKEN, network = DEFAULT_NETWORK, wallet = WALLET }) {
  await ensureUnlocked(wallet);
  const args = ["send", "--network", network, "--to", to, "--amount", String(amount)];
  if (token) args.push("--token", token);
  args.push("--dry-run");
  return execWdk(args, { wallet });
}

/**
 * Ejecuta un envío real. Devuelve la respuesta del CLI (tx hash, etc.).
 */
export async function sendTokens({ to, amount, token = DEFAULT_TOKEN, network = DEFAULT_NETWORK, wallet = WALLET }) {
  await ensureUnlocked(wallet);
  const args = ["send", "--network", network, "--to", to, "--amount", String(amount)];
  if (token) args.push("--token", token);
  return execWdk(args, { wallet });
}

/** Lista de redes disponibles (name, network, type, testnet). */
export async function listNetworks() {
  return execWdk(["network", "list"]);
}

/** Lista de tokens registrados por red. */
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
