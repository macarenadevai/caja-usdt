"use client";

import { formatUsd, formatFecha, folioFromId } from "@/lib/api";

interface ReciboProps {
  id: string; // internal id (invoice_*/trx_*) → ticket-style folio
  tipo: "Payment" | "Transfer" | "Agent transfer";
  monto: number;
  desde?: string; // friendly label of the sender
  hacia: string; // friendly label of the destination
  estado: "Paid" | "Confirmed" | "Sent" | "Failed";
  txHash?: string | null;
}

/** Point-of-sale ticket-style receipt — short folio, no jargon. */
export default function Recibo({
  id,
  tipo,
  monto,
  desde,
  hacia,
  estado,
  txHash,
}: ReciboProps) {
  const ok = estado === "Paid" || estado === "Confirmed";
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-dashed border-[#2A3050] bg-[#14172B]">
      <div className="flex items-center justify-between border-b border-dashed border-[#2A3050] bg-[#1C2038] px-4 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9BE8C8]">
          Quinto · Receipt
        </p>
        <p className="font-mono text-[10px] font-bold text-zinc-400">{folioFromId(id)}</p>
      </div>
      <div className="space-y-1.5 px-4 py-3">
        <p className="text-2xl font-black text-white">{formatUsd(monto)}</p>
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{tipo}</p>
        <div className="space-y-0.5 pt-1 text-[11px] leading-relaxed text-zinc-400">
          {desde && (
            <p>
              <span className="text-zinc-500">From:</span> {desde}
            </p>
          )}
          <p>
            <span className="text-zinc-500">To:</span> {hacia}
          </p>
          <p>
            <span className="text-zinc-500">Method:</span> Digital dollars (USD₮)
          </p>
          <p>
            <span className="text-zinc-500">Date:</span> {formatFecha()}
          </p>
        </div>
        <div className="flex items-center justify-between pt-1.5">
          <p className={`text-xs font-black ${ok ? "text-[#9BE8C8]" : "text-red-300"}`}>
            {estado} {ok ? "✓" : "✗"}
          </p>
          {txHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-lg border border-[#2A3050] px-2 py-1 text-[10px] font-bold text-zinc-300 transition hover:border-[#9BE8C8] hover:text-[#9BE8C8]"
            >
              View on Etherscan ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
