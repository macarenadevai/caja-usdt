# 🎬 Guion — Demo de 3 minutos (Quinto)

> **Tesis**: NO es "otra app de pagos con IA". Es **la caja registradora de tu negocio en USD₮**.
> El juez debe ver en los primeros 20 segundos un **negocio cobrando** — no un chat.
> Audio en español. Producto = protagonista.

---

## 📋 Setup (antes de grabar)

- Wallets (testnet Sepolia, ya fondeadas):
  - **CAJA** (negocio): `0x5A6B8B635b6674681682dB4F713faF4001ac6Cb2` — ~90 USDT
  - **PAGADOR** (cliente): `0x66dEc61c81105249fD38480157C37AcFb45A1a8b` — ~985 USDT
- Servicios corriendo: backend :8788 + frontend :3000
  - Landing en `:3000/` · **App en `:3000/app`**
- **Grabar con** OBS (o similar) sobre el navegador, pantalla completa, resolución 1440p+
- Preparar terminal con el comando de pago del pagador copiado (para el corte de Cobrar)
- **Sonido activado**: el *cha-ching* de la caja es parte del momento estrella

---

## 0:00 — Hook (15s)

**Voz**: "En América Latina, si tienes un negocio y quieres operar en dólares... es un problema. Los bancos te piden historial. Las remesas te comen 10%. Y si aceptas cripto... no tienes caja, tienes una wallet complicada."

**Pantalla**: abre la **landing** (`:3000/`) — logo ₮ Quinto + "Tu celular es tu terminal de cobro" + el **teléfono-terminal** (la app de Quinto corriendo en un iPhone mockup). Scroll rápido: el problema → cómo funciona. Clic "Abrir la app" → entra a la app (`:3000/app`). **Frase clave: "Tu celular es tu terminal punto de venta."**

---

## 0:15 — Cobrar (40s) ⭐ EL MOMENTO ESTRELLA

**Voz**: "Quinto convierte tu wallet en una caja registradora. Abres la vista Cobrar, pones el monto... y listo: tu cliente paga con lo que sea que tenga — hasta una wallet que nadie instaló para esto."

**Pantalla** (frontend `:3000/app` → tab Cobrar):
1. Monto `12.50` → se genera el **QR** al instante (pantalla-terminal: monto gigante + QR)
2. *Corte*: terminal → el cliente (PAGADOR) ejecuta su pago:
   ```
   wdk send --network sepolia --wallet pagador --to 0x5A6B8B... --amount 12.5 --token usdt
   ✓ Transacción enviada: 0x...
   ```
3. **Volver al dashboard**: el QR se cierra solo → **"✅ Pago recibido +12.50 USDT"** en vivo + **🎵 cha-ching** (sonido de caja registradora)
4. Muestra el saldo subir (ledger/header)

**Clave**: el pago se detecta SOLO (eventos on-chain, no un webhook inventado). Eso se dice en una frase.

---

## 0:55 — Enviar (25s)

**Voz**: "Y cuando el negocio tiene que mandar dinero —una remesa, un proveedor— Quinto lo envía con tracking. Como un paquete, pero para dinero."

**Pantalla** (tab Enviar):
1. Dirección + monto `8` → confirmar
2. **Stepper visible**: `Enviado → Confirmado` (mientras la red confirma)
3. "Mira: la transacción quedó confirmada en la cadena. Tú y tu proveedor ven lo mismo."
4. **Bonus**: mostrar el **historial de remesas** que quedó debajo (todas las operaciones con su estado)

---

## 1:20 — Delegar (40s) — "el agente de Quinto"

**Voz**: "Y lo mejor: no tienes que tocar la caja. Le hablas a tu agente de caja... y él propone, tú confirmas."

**Pantalla** (tab Agente):
1. Escribir: *"manda 5 USDT a 0x66dE... por la materia prima"*
2. El agente responde con la **propuesta**: monto, destino, token → botón **Confirmar**
3. Click → envío real → **tracking confirmado** en el chat (sent → confirmed en vivo)
4. **Frase clave**: "El agente propone. El humano decide. Así opera la caja: contigo siempre al mando."

---

## 2:00 — Impacto + cierre (30s)

**Voz**: "Una caja. Un solo libro de cuentas. Todo tu negocio en USD₮: lo que cobras, lo que envías, lo que delegas. Sin bancos, sin intermediarios, sin que tu cliente sepa siquiera qué es una blockchain."

**Pantalla**: historial/ledger final (cobro +12.50, envíos confirmados) → volver a la **landing** → logo ₮ + "Quinto — tu negocio en USD₮ · construido con Tether WDK".

---

## 🎥 Notas de producción

1. **Ensayo en frío antes de grabar**: corre `~/aleph-hackathon/scripts/ensayo.sh` 2 veces — el flujo debe salir perfecto (pago detectado <10s).
2. **El corte del pago del cliente**: el pago del PAGADOR se hace con CLI en otra terminal/ventana — cortar a pantalla completa del navegador mientras el QR está vivo.
3. **Timing**: si el pago tarda >15s en confirmarse, espera a que el "Pago recibido" aparezca ANTES de avanzar al siguiente segmento (el detector sondea cada 5s, normalmente es <10s).
4. **Fondo**: mantener la estética del producto (dark + verde neón). No mostrar código del server en cámara.
5. **Fallback**: si el agente fallara en vivo (LLM lento), cortar al flujo Enviar y mencionar el agente de pasada — NUNCA dejar un silencio.
6. **Duración dura**: 2:30-3:00. Si se pasa, recortar Enviar a 15s (el stepper se entiende igual).
