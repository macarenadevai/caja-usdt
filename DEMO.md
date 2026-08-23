# 🎬 Script — 3-minute demo (Quinto)

> **Thesis**: it's NOT "another AI payments app". It's **your business's USD₮ cash register**.
> The judge should see within the first 20 seconds a **business collecting** — not a chat.
> Audio in English. Product = the protagonist.

---

## 📋 Setup (before recording)

- Wallets (Sepolia testnet, already funded):
  - **CAJA** (business): `0x5A6B8B635b6674681682dB4F713faF4001ac6Cb2` — ~90 USDT
  - **PAGADOR** (customer): `0x66dEc61c81105249fD38480157C37AcFb45A1a8b` — ~985 USDT
- Services running: backend :8788 + frontend :3000
  - Landing at `:3000/` · **App at `:3000/app`**
- **Record with** OBS (or similar) over the browser, full screen, 1440p+ resolution
- Prepare a terminal with the customer's payment command copied (for the Collect cut)
- **Sound on**: the cash register *cha-ching* is part of the star moment

---

## 0:00 — Hook (15s)

**Voice**: "In Latin America, if you run a business and you want to operate in dollars... it's a problem. Banks demand history. Remittances eat 10%. And if you accept crypto... you don't get a cash register, you get a complicated wallet."

**Screen**: open the **landing** (`:3000/`) — ₮ Quinto logo + "Your phone is your payment terminal" + the **terminal-phone** (the Quinto app running in an iPhone mockup). Quick scroll: the problem → how it works. Click "Open Quinto" → enter the app (`:3000/app`). **Key phrase: "Your phone is your point-of-sale terminal."**

---

## 0:15 — Collect (40s) ⭐ THE STAR MOMENT

**Voice**: "Quinto turns your wallet into a cash register. You open the Collect view, set the amount... and that's it: your customer pays with whatever they have — even a wallet nobody installed for this."

**Screen** (frontend `:3000/app` → Collect tab):
1. Amount `12.50` → the **QR** generates instantly (terminal screen: giant amount + QR)
2. *Cut*: terminal → the customer (PAGADOR) runs their payment:
   ```
   wdk send --network sepolia --wallet pagador --to 0x5A6B8B... --amount 12.5 --token usdt
   ✓ Transaction sent: 0x...
   ```
3. **Back to the dashboard**: the QR closes by itself → **"✅ Payment received +12.50 USDT"** live + **🎵 cha-ching** (cash register sound)
4. Show the balance going up (ledger/header)

**Key**: the payment is detected on its own (on-chain events, not a made-up webhook). Say that in one sentence.

---

## 0:55 — Send (25s)

**Voice**: "And when the business has to send money — a remittance, a supplier — Quinto sends it with tracking. Like a package, but for money."

**Screen** (Send tab):
1. Address + amount `8` → confirm
2. **Stepper visible**: `Sent → Confirmed` (while the network confirms)
3. "Look: the transaction is confirmed on-chain. You and your supplier see the same thing."
4. **Bonus**: show the **transfer history** below (every operation with its status)

---

## 1:20 — Delegate (40s) — "the Quinto agent"

**Voice**: "And the best part: you don't have to touch the cashbox. You talk to your cashbox agent... and it proposes, you confirm."

**Screen** (Agent tab):
1. Type: *"send 5 USDT to 0x66dE... for the raw materials"*
2. The agent replies with the **proposal**: amount, destination, token → **Confirm** button
3. Click → real transfer → **confirmed tracking** in the chat (sent → confirmed live)
4. **Key phrase**: "The agent proposes. The human decides. That's how the cashbox operates: you're always in control."

---

## 2:00 — Impact + closing (30s)

**Voice**: "One cashbox. One ledger. Your whole business in USD₮: what you collect, what you send, what you delegate. No banks, no intermediaries, and your customer never even needs to know what a blockchain is."

**Screen**: final history/ledger (collect +12.50, confirmed transfers) → back to the **landing** → ₮ logo + "Quinto — your business in USD₮ · built with Tether WDK".

---

## 🎥 Production notes

1. **Cold rehearsal before recording**: run `~/aleph-hackathon/scripts/ensayo.sh` twice — the flow must come out perfect (payment detected <10s).
2. **The customer-payment cut**: the PAGADOR payment is done via CLI in another terminal/window — cut to full-screen browser while the QR is alive.
3. **Timing**: if the payment takes >15s to confirm, wait for the "Payment received" toast to appear BEFORE moving to the next segment (the detector polls every 5s, usually <10s).
4. **Background**: keep the product aesthetic (dark + neon green). Never show server code on camera.
5. **Fallback**: if the agent fails live (slow LLM), cut to the Send flow and mention the agent in passing — NEVER leave silence.
6. **Hard duration**: 2:30–3:00. If it runs over, trim Send to 15s (the stepper still reads fine).
