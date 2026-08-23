"use client";

import { useEffect, useState } from "react";
import { api, type Contact, shortAddress } from "@/lib/api";
import { BookUser, Copy, Plus, Trash2, X } from "lucide-react";

interface Props {
  onSeleccionar: (c: Contact) => void;
  onCerrar: () => void;
}

export default function Contactos({ onSeleccionar, onCerrar }: Props) {
  const [list, setList] = useState<Contact[]>([]);
  const [nuevo, setNuevo] = useState(false);
  const [alias, setAlias] = useState("");
  const [addr, setAddr] = useState("");
  const [err, setErr] = useState("");

  const load = () => api.contacts.list().then(setList).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const copiar = async (a: string) => {
    try {
      await navigator.clipboard.writeText(a);
    } catch {
      /* clipboard denegado — ignorar */
    }
  };

  const guardar = async () => {
    if (!alias.trim() || !/^0x[a-fA-F0-9]{40}$/.test(addr.trim())) {
      setErr("Necesitas un nombre y una dirección 0x válida");
      return;
    }
    try {
      await api.contacts.create(alias.trim(), addr.trim());
      setAlias("");
      setAddr("");
      setErr("");
      setNuevo(false);
      await load();
    } catch (e: any) {
      setErr(e.message || "No se pudo guardar");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className="max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[#2A3050] bg-[#14172B] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black text-white">
            <BookUser className="h-5 w-5 text-[#9BE8C8]" /> Contactos
          </h2>
          <button
            onClick={onCerrar}
            className="rounded-lg p-2 text-zinc-400 hover:bg-[#2A3050]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!nuevo ? (
          <button
            onClick={() => setNuevo(true)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#9BE8C8]/50 py-3 text-sm font-bold text-[#9BE8C8] hover:bg-[#9BE8C8]/10"
          >
            <Plus className="h-4 w-4" /> Nuevo contacto
          </button>
        ) : (
          <div className="mb-4 space-y-2 rounded-xl border border-[#2A3050] bg-[#1C2038] p-3">
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Nombre (ej. Ferretería López)"
              className="w-full rounded-lg border border-[#2A3050] bg-[#14172B] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#9BE8C8]"
            />
            <input
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              placeholder="Dirección 0x…"
              className="w-full rounded-lg border border-[#2A3050] bg-[#14172B] px-3 py-2 font-mono text-xs text-white outline-none placeholder:text-zinc-500 focus:border-[#9BE8C8]"
            />
            {err && <p className="text-xs text-red-400">{err}</p>}
            <div className="flex gap-2">
              <button
                onClick={guardar}
                className="flex-1 rounded-lg bg-[#9BE8C8] py-2 text-sm font-bold text-black"
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  setNuevo(false);
                  setErr("");
                }}
                className="rounded-lg border border-[#2A3050] px-4 py-2 text-sm font-bold text-zinc-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {list.length === 0 && !nuevo && (
          <p className="py-8 text-center text-sm text-zinc-500">
            Aún no tienes contactos. Guarda una dirección o crea uno.
          </p>
        )}

        <div className="space-y-2">
          {list.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-xl border border-[#2A3050] bg-[#1C2038] p-3"
            >
              <button
                onClick={() => onSeleccionar(c)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#9BE8C8]/15 text-sm font-black text-[#9BE8C8]">
                  {c.alias.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{c.alias}</p>
                  <p className="truncate font-mono text-[11px] text-zinc-500">
                    {shortAddress(c.address)}
                  </p>
                </div>
              </button>
              <button
                onClick={() => copiar(c.address)}
                className="rounded-lg p-2 text-zinc-400 hover:text-[#9BE8C8]"
                title="Copiar dirección"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={async () => {
                  await api.contacts.remove(c.id);
                  await load();
                }}
                className="rounded-lg p-2 text-zinc-500 hover:text-red-400"
                title="Borrar contacto"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
