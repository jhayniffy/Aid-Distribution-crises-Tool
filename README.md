# Crisis Aid Distribution Tool

A blockchain-powered humanitarian aid distribution platform built on the **Stellar network**. It enables NGOs to distribute financial aid to crisis-affected recipients in a transparent, verifiable, and tamper-proof way — with geofence-gated claiming, SMS-delivered wallets, and on-chain transparency reports.

---

## Overview

Traditional aid distribution is plagued by inefficiency, fraud, and lack of accountability. This tool replaces cash vouchers and manual ledgers with Stellar blockchain transactions — every payment is publicly auditable, instant, and near-zero cost.

**Key capabilities:**

- **Batch distribution** — send XLM (or any Stellar asset) to up to 100 recipients in a single transaction
- **Burner wallet provisioning** — generate a Stellar keypair for a recipient and deliver the secret key via SMS (Twilio), no smartphone app required.
- **Geofence-gated claiming** — recipients can only claim aid when physically inside the designated disaster zone (browser.Geolocation + ray-casting polygon check)
- **Transparency reports** — download a PDF audit trail of all aid transactions for a given NGO account
- **PWA-ready** — ships with a service worker and web manifest for offline-capable field use

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (PWA)                        │
│                                                             │
│   ┌──────────────────┐        ┌──────────────────────────┐  │
│   │  /dashboard      │        │  /claim                  │  │
│   │  NGO operator UI │        │  Recipient claim UI      │  │
│   │  - Batch send    │        │  - Geolocation check     │  │
│   │  - Create wallet │        │  - Geofence validation   │  │
│   │  - PDF report    │        │  - Submit claim tx       │  │
│   └────────┬─────────┘        └────────────┬─────────────┘  │
│            │                               │                │
│            │  fetch()                      │  fetch()       │
└────────────┼───────────────────────────────┼────────────────┘
             │                               │
┌────────────▼───────────────────────────────▼────────────────┐
│                    Next.js API Routes                        │
│                                                             │
│   POST /api/distribute    POST /api/identity    GET /api/report │
│   ┌─────────────────┐   ┌──────────────────┐  ┌───────────┐ │
│   │ Build & sign    │   │ Generate keypair │  │ Fetch txs │ │
│   │ batch payment   │   │ Fund via         │  │ from      │ │
│   │ transaction     │   │ Friendbot        │  │ Horizon   │ │
│   │ (up to 100 ops) │   │ SMS secret key   │  │ Build PDF │ │
│   └────────┬────────┘   └───────┬──────────┘  └─────┬─────┘ │
└────────────┼────────────────────┼─────────────────────┼──────┘
             │                    │                     │
┌────────────▼────────────────────▼─────────────────────▼──────┐
│                     External Services                         │
│                                                               │
│   ┌──────────────────────────┐    ┌──────────────────────┐   │
│   │  Stellar Horizon API     │    │  Twilio SMS API      │   │
│   │  (testnet / mainnet)     │    │  (secret key SMS)    │   │
│   │  - Submit transactions   │    │                      │   │
│   │  - Query tx history      │    └──────────────────────┘   │
│   └──────────────────────────┘                               │
└───────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **NGO operator** opens `/dashboard`, pastes recipient public keys, sets an amount, and clicks **Distribute Aid**.
2. The browser POSTs to `/api/distribute`, which builds a multi-operation Stellar transaction signed by the NGO's secret key (`NGO_SECRET_KEY`) and submits it to Horizon.
3. **New recipients** without a wallet: the operator enters a phone number → `/api/identity` generates a fresh Stellar keypair, funds it via Friendbot (testnet) or pre-funding (mainnet), and SMSes the secret key via Twilio.
4. **Recipients in the field** open `/claim` on any browser. The page requests their GPS location, runs a ray-casting point-in-polygon check against the configured disaster zone polygon, and — if inside — submits a claim transaction using the secret key stored in `localStorage`.
5. The operator can download a **PDF transparency report** at any time via `/api/report`, which queries Horizon for all transactions matching the aid memo tag.

---

## Project Structure

```
├── pages/
│   ├── dashboard.js        # NGO operator interface
│   ├── claim.js            # Recipient geofenced claim page
│   ├── _app.js             # Global layout / styles
│   ├── _document.js        # Custom HTML document (PWA meta)
│   └── api/
│       ├── distribute.js   # Batch payment API route
│       ├── identity.js     # Wallet provisioning + SMS API route
│       └── report.js       # PDF transparency report API route
├── lib/
│   ├── stellar.js          # Stellar SDK helpers (keypair, Horizon, Friendbot)
│   └── geofence.js         # Ray-casting geofence + Geolocation wrapper
├── styles/
│   └── globals.css         # Tailwind base styles
├── public/
│   ├── sw.js               # Service worker (offline support)
│   └── manifest.json       # PWA manifest
├── .env.local              # Environment variables (never commit)
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (Pages Router) |
| Blockchain | Stellar (via `@stellar/stellar-sdk` v12) |
| Styling | Tailwind CSS |
| SMS delivery | Twilio |
| PDF generation | jsPDF + jspdf-autotable |
| Geofencing | Browser Geolocation API + ray-casting |
| Offline support | Service Worker (PWA) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Stellar testnet account (or mainnet for production)
- Twilio account (optional — wallet creation still works without SMS)

### Installation

```bash
git clone https://github.com/jhayniffy/crisis-aid-distribution-tool.git
cd crisis-aid-distribution-tool
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Stellar
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET          # or PUBLIC for mainnet
NEXT_PUBLIC_NGO_PUBLIC_KEY=G...              # NGO's public key (shown in UI)
NGO_SECRET_KEY=S...                          # NGO's secret key (server-side only)

# Twilio (optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

> ⚠️ **Never commit `NGO_SECRET_KEY` or Twilio credentials.** `.env.local` is gitignored by default in Next.js.

### Run

```bash
npm run dev      # development
npm run build    # production build
npm start        # production server
```

---

## Code Snippets

### Batch Aid Distribution (`/api/distribute`)

Builds a single Stellar transaction with up to 100 payment operations — one per recipient — signed by the NGO's key and submitted to Horizon.

```js
const account = await server.loadAccount(sourceKeys.publicKey());

const txBuilder = new StellarSdk.TransactionBuilder(account, {
  fee: StellarSdk.BASE_FEE,
  networkPassphrase,
}).addMemo(StellarSdk.Memo.text('EMERGENCY_AID_V1'));

for (const { publicKey, amount } of recipients) {
  txBuilder.addOperation(
    StellarSdk.Operation.payment({
      destination: publicKey,
      asset: StellarSdk.Asset.native(), // XLM
      amount: String(amount),
    })
  );
}

const tx = txBuilder.setTimeout(30).build();
tx.sign(sourceKeys);
const result = await server.submitTransaction(tx);
// result.hash is the on-chain transaction ID
```

### Geofence Check (`/claim`)

Uses a ray-casting algorithm to determine if the recipient's GPS coordinates fall inside the disaster zone polygon before allowing a claim.

```js
// lib/geofence.js
export function isInsideGeofence(point, polygon) {
  let inside = false;
  const { lat: px, lng: py } = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { lat: xi, lng: yi } = polygon[i];
    const { lat: xj, lng: yj } = polygon[j];
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// pages/claim.js — usage
const pos = await getCurrentPosition();
const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };

if (!isInsideGeofence(point, DISASTER_ZONE)) {
  setStatus('denied'); // recipient is outside the zone
  return;
}
```

### Wallet Provisioning via SMS (`/api/identity`)

Generates a fresh Stellar keypair, funds it on testnet via Friendbot, and SMSes the secret key to the recipient — the secret is never stored server-side.

```js
const { publicKey, secretKey } = generateKeypair();

// Fund on testnet
await fundTestnetAccount(publicKey);

// Deliver secret key via SMS — never persisted
await twilio.messages.create({
  to: phone,
  from: process.env.TWILIO_PHONE_NUMBER,
  body: `Your Crisis Aid wallet key: ${secretKey}\nPublic: ${publicKey}`,
});

return res.status(200).json({ publicKey }); // secret stays off-server
```

---

## Security Considerations

- **`NGO_SECRET_KEY` is server-side only** — it is never exposed to the browser or included in API responses.
- **Recipient secret keys are never stored** — they are generated ephemerally and delivered once via SMS.
- **Geofence enforcement is client-side** — for higher-security deployments, move the GPS check to the server by having the client submit signed location proofs.
- **Batch limit of 100** — Stellar transactions support up to 100 operations; the API enforces this hard cap.
- **Memo tagging** — every distribution uses a memo string (e.g. `EMERGENCY_AID_V1`) enabling precise on-chain filtering for audits.

---

## License

MIT
