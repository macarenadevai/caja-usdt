// contacts.js — Contactos (alias → dirección) para envíos frecuentes.
// Persistencia: server/data/contactos.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const FILE = path.join(DATA_DIR, "contactos.json");

// Alias fijos del demo (siempre disponibles)
export const FIXED_ALIASES = {
  "0x5a6b8b635b6674681682db4f713faf4001ac6cb2": "tu caja",
  "0x66dec61c81105249fd38480157c37acfb45a1a8b": "tu cliente",
  "0x9dabbf114698bd9bfbf6222b9fd6cd967ecd3850": "tu cuenta personal",
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
  if (!a) throw new Error("El alias es obligatorio");
  if (!ADDR_RE.test(ad)) throw new Error("Dirección inválida (0x… de 40 hex)");
  const list = load();
  if (list.some((c) => c.alias.toLowerCase() === a.toLowerCase()))
    throw new Error(`Ya existe un contacto con alias "${a}"`);
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

/** Resuelve alias → dirección (case-insensitive) o null. */
export function resolveAlias(alias) {
  const a = (alias || "").trim().toLowerCase();
  return load().find((c) => c.alias.toLowerCase() === a)?.address || null;
}

/** Mapa dirección → alias (fijos + contactos) para friendlyText. */
export function getAliasMap() {
  const m = { ...FIXED_ALIASES };
  for (const c of load()) m[c.address.toLowerCase()] = c.alias;
  return m;
}
