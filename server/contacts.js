// contacts.js — Contacts (alias → address) for frequent transfers.
// Persistence: server/data/contactos.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const FILE = path.join(DATA_DIR, "contactos.json");

// Alias fijos del demo (siempre disponibles)
export const FIXED_ALIASES = {
  "0x5a6b8b635b6674681682db4f713faf4001ac6cb2": "your cashbox",
  "0x66dec61c81105249fd38480157c37acfb45a1a8b": "your customer",
  "0x9dabbf114698bd9bfbf6222b9fd6cd967ecd3850": "your personal account",
};

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}

function save(list) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
}

export function listContacts() {
  return load();
}

export function addContact({ alias, address }) {
  const a = (alias || "").trim();
  const ad = (address || "").trim().toLowerCase();
  if (!a) throw new Error("Alias is required");
  if (!ADDR_RE.test(ad)) throw new Error("Invalid address (0x… 40 hex)");
  const list = load();
  if (list.some((c) => c.alias.toLowerCase() === a.toLowerCase()))
    throw new Error(`A contact with alias "${a}" already exists`);
  const c = { id: `ctc_${Date.now().toString(36)}`, alias: a, address: ad };
  list.push(c);
  save(list);
  return c;
}

export function removeContact(id) {
  const list = load().filter((c) => c.id !== id);
  save(list);
  return true;
}

/** Resolves alias → address (case-insensitive) or null. */
export function resolveAlias(alias) {
  const a = (alias || "").trim().toLowerCase();
  return load().find((c) => c.alias.toLowerCase() === a)?.address || null;
}

/** Map address → alias (fixed + contacts) for friendlyText. */
export function getAliasMap() {
  const m = { ...FIXED_ALIASES };
  for (const c of load()) m[c.address.toLowerCase()] = c.alias;
  return m;
}
