import * as StellarSdk from '@stellar/stellar-sdk';

const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'PUBLIC'
    ? StellarSdk.Networks.PUBLIC
    : StellarSdk.Networks.TESTNET;

export const server = new StellarSdk.Horizon.Server(HORIZON_URL);
export const networkPassphrase = NETWORK_PASSPHRASE;

/** Generate a fresh Stellar keypair */
export function generateKeypair() {
  const kp = StellarSdk.Keypair.random();
  return { publicKey: kp.publicKey(), secretKey: kp.secret() };
}

/** Derive keypair from secret */
export function keypairFromSecret(secret) {
  return StellarSdk.Keypair.fromSecret(secret);
}

/** Fund a new account on testnet via Friendbot */
export async function fundTestnetAccount(publicKey) {
  const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok) throw new Error('Friendbot funding failed');
  return res.json();
}
