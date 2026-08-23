#!/usr/bin/env bash
# Ensayo completo de Quinto: cobro → pago real on-chain → confirmación → envío
# Uso: ./scripts/ensayo.sh [monto]
set -euo pipefail

API="${API:-http://localhost:8788}"
CAJA="0x5A6B8B635b6674681682dB4F713faF4001ac6Cb2"
PAGADOR="0x66dEc61c81105249fD38480157C37AcFb45A1a8b"
MONTO="${1:-5}"
WDK_BIN="${WDK_BIN:-/home/macarena/.hermes/node/bin/wdk}"

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }

echo "── 1) Crear invoice de ${MONTO} USDT"
INV=$(curl -s -X POST "$API/api/invoice" -H "Content-Type: application/json" -d "{\"amount\":$MONTO}")
ID=$(echo "$INV" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "   invoice: $ID"

echo "── 2) Pagar desde la wallet pagador (pago real on-chain)"
# Passphrase de la wallet pagador (testnet demo — variable de entorno, fallback solo local)
export WDK_PASSPHRASE="${PAGADOR_PASSPHRASE:-pagador-demo-2026}"
"$WDK_BIN" wallet unlock --name pagador --json >/dev/null 2>&1
"$WDK_BIN" send --network sepolia --wallet pagador --to "$CAJA" --amount "$MONTO" --token usdt --json \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('   tx:', d.get('txHash') or d.get('txid') or d)" \
  || red "   PAGO FALLÓ (¿fondos?)"

echo "── 3) Esperar confirmación del detector (receipt on-chain)"
STATUS="pending"
for i in $(seq 1 15); do
  sleep 3
  STATUS=$(curl -s "$API/api/invoice/$ID" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','?'))")
  echo "   [$(date +%H:%M:%S)] status: $STATUS"
  [ "$STATUS" = "paid" ] && break
done
[ "$STATUS" = "paid" ] && green "✓ PAGO CONFIRMADO" || red "✗ TIEMPO AGOTADO"

echo "── 4) Verificar ledger"
curl -s "$API/api/transactions" | python3 -c "
import sys, json
d = json.load(sys.stdin)
txs = d.get('transactions', d) if isinstance(d, dict) else d
for t in txs[:5]:
    print(f\"   {t.get('type','?'):9s} {t.get('status','?'):10s} {t.get('amount','?')} {t.get('title','')[:36]}\")"

echo "── 5) Saldo final"
curl -s "$API/api/balance" | python3 -c "import sys,json; d=json.load(sys.stdin); print('   USDT:', d.get('formatted') or d.get('balance'))"
