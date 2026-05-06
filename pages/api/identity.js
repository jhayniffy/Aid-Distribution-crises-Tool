// POST /api/identity
// Body: { phone }  →  generates keypair, funds on testnet, returns publicKey
// The secretKey is SMS'd to the recipient; never stored server-side.
import { generateKeypair, fundTestnetAccount } from '../../lib/stellar';

const twilio =
  process.env.TWILIO_ACCOUNT_SID &&
  require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });

  const { publicKey, secretKey } = generateKeypair();

  // Fund on testnet (skip on mainnet — NGO pre-funds instead)
  if (process.env.NEXT_PUBLIC_STELLAR_NETWORK !== 'PUBLIC') {
    await fundTestnetAccount(publicKey);
  }

  // Send secret key via SMS so the recipient can import into any Stellar wallet
  if (twilio) {
    await twilio.messages.create({
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER,
      body: `Your Crisis Aid wallet key: ${secretKey}\nPublic address: ${publicKey}\nKeep this safe — it controls your funds.`,
    });
  }

  // Return only the public key; secret never persisted
  return res.status(200).json({ publicKey });
}
