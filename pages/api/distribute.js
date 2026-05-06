// POST /api/distribute
// Body: { recipients: [{ publicKey, amount }], memo, asset? }
import * as StellarSdk from '@stellar/stellar-sdk';
import { server, networkPassphrase, keypairFromSecret } from '../../lib/stellar';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { recipients, memo = 'EMERGENCY_AID_V1', asset } = req.body;
  if (!Array.isArray(recipients) || recipients.length === 0)
    return res.status(400).json({ error: 'recipients required' });
  if (recipients.length > 100)
    return res.status(400).json({ error: 'max 100 recipients per batch' });

  const sourceKeys = keypairFromSecret(process.env.NGO_SECRET_KEY);
  const payAsset = asset
    ? new StellarSdk.Asset(asset.code, asset.issuer)
    : StellarSdk.Asset.native();

  try {
    const account = await server.loadAccount(sourceKeys.publicKey());
    const txBuilder = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase,
    }).addMemo(StellarSdk.Memo.text(memo.slice(0, 28)));

    for (const { publicKey, amount } of recipients) {
      txBuilder.addOperation(
        StellarSdk.Operation.payment({ destination: publicKey, asset: payAsset, amount: String(amount) })
      );
    }

    const tx = txBuilder.setTimeout(30).build();
    tx.sign(sourceKeys);
    const result = await server.submitTransaction(tx);
    return res.status(200).json({ hash: result.hash });
  } catch (err) {
    const detail = err.response?.data?.extras?.result_codes || err.message;
    return res.status(500).json({ error: detail });
  }
}
