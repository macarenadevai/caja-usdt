# 🎬 Guion — Demo de 3 minutos (Caja)

> Estilo hook → problema → demo en vivo → impacto. En español (permitido por las bases).
> Audio en español; el producto es la estrella, no la narrativa.

---

## Hook (0:00–0:20)

**VO**: *"Tu negocio opera en USD₮. Pero cobrar es un dolor, enviar es opaco,
y operar la wallet es técnica. Caja convierte la wallet de tu negocio en una
caja registradora — con un agente que la opera por ti."*

**Pantalla**: dashboard de Caja (tema oscuro, verde neón). Se ve el saldo
USDT arriba.

---

## Demo 1 — Cobrar (0:20–1:10)

1. Tab **Cobrar**. Escribimos **$25.00**.
2. Apretamos **Generar QR** → aparece un QR grande con la dirección y el monto.
3. **(En pantalla dividida o cortando a otra ventana)** El cliente —una segunda
   wallet WDK local— escanea/paga: `wdk send --to <caja> --amount 25 --token usdt`.
4. Volvemos a la pantalla del negocio: **"Esperando pago…"** con pulso.
5. **El QR cambia a verde: "¡Pago recibido! +$25.00 USDT"** con check animado.
6. El saldo del header sube.

**Texto en pantalla (VO)**: *"El cobro se confirma con el receipt on-chain —
nada de simulaciones."*

---

## Demo 2 — Enviar con el agente (1:10–2:20)

1. Tab **Agente**. Escribimos en el chat:
   *"Págale $10 USDT a mi proveedor 0x66dE…A1a8b"*
2. El agente responde (DeepSeek vía wdk-mcp) y **muestra la propuesta**:
   *"¿Confirmas el envío de 10 USDT a 0x66dE…A1a8b? (fee estimado)"*
3. Apretamos **Confirmar**.
4. Vemos el **tracking estilo paquetería**: `Enviado → Confirmado` (receipt
   on-chain verificado) → check verde.
5. El ledger registra la operación.

**Texto en pantalla (VO)**: *"El agente opera la caja vía el MCP server del
WDK — pero nunca mueve dinero sin tu confirmación."*

---

## Impacto y cierre (2:20–3:00)

- *"Una caja registradora en USD₮, non-custodial, multi-chain — para el
  negocio de la esquina en LATAM."*
- *"Cobro con QR, remesas con tracking, y un agente que trabaja tu caja."*
- *"Construido sobre el WDK CLI y su MCP server como core building block:
  cada operación es un comando `wdk`, y el agente conversa con la wallet vía
  MCP."*
- Cierre visual: QR verde + check + log del ledger.

**Pantalla final**: repo https://github.com/macarenadevai/caja-usdt + demo.

---

## Notas de producción

| Elemento | Detalle |
|----------|---------|
| Duración | 2:45–3:00 |
| Resolución | 1920×1080 |
| Grabación | OBS o `ffmpeg` screen capture; recortes del pago con zoom |
| Wallet del cliente | WDK wallet local `pagador` (passphrase demo) — el pago es real on-chain |
| Fallback agente | Si DeepSeek falla en vivo, el chat tiene respuesta offline explicando el dry-run |
| Fallback demo | Si el fondeo no alcanzó: usar la otra wallet para el pago (caja → pagador → caja) |
| Música | Ninguna o ambiente muy baja (mejor sin música: más serio) |
| Captions | Sí — subtítulos para claridad (negocio ruidoso) |

## Comandos del cliente (para el corte del pago)

```bash
# Wallet del cliente (pagador) — se muestra en el video
export WDK_PASSPHRASE="pagador-demo-2026"
wdk wallet unlock --name pagador
wdk send --network sepolia --wallet pagador --to 0x5A6B8B635b6674681682dB4F713faF4001ac6Cb2 --amount 25 --token usdt
```
