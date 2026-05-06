import { useState } from 'react';

export default function Dashboard() {
  const [recipients, setRecipients] = useState('');
  const [memo, setMemo] = useState('EMERGENCY_AID_V1');
  const [amount, setAmount] = useState('10');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Parse textarea: one public key per line, optionally "GXXX amount"
  function parseRecipients() {
    return recipients
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [publicKey, amt] = line.split(/\s+/);
        return { publicKey, amount: amt || amount };
      });
  }

  async function handleDistribute(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: parseRecipients(), memo }),
      });
      const data = await res.json();
      setResult(res.ok ? { ok: true, hash: data.hash } : { ok: false, error: data.error });
    } catch (err) {
      setResult({ ok: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateWallet(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      setResult(res.ok ? { ok: true, publicKey: data.publicKey } : { ok: false, error: data.error });
    } catch (err) {
      setResult({ ok: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-blue-800">NGO Aid Dashboard</h1>

        {/* Batch Distribution */}
        <section className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">Batch Distribution</h2>
          <form onSubmit={handleDistribute} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Recipients (one per line: <code>GXXX [amount]</code>)
              </label>
              <textarea
                className="w-full border rounded-lg p-2 text-sm font-mono h-32 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="GABC... 10&#10;GDEF... 15"
                required
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 mb-1">Default Amount (XLM)</label>
                <input
                  type="number"
                  min="0.0000001"
                  step="any"
                  className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 mb-1">Memo (max 28 chars)</label>
                <input
                  type="text"
                  maxLength={28}
                  className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? 'Sending…' : 'Distribute Aid'}
            </button>
          </form>
        </section>

        {/* Burner Wallet Creation */}
        <section className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">Create Recipient Wallet (SMS)</h2>
          <form onSubmit={handleCreateWallet} className="flex gap-3">
            <input
              type="tel"
              className="flex-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="+2348012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50 transition"
            >
              {loading ? '…' : 'Create & SMS'}
            </button>
          </form>
        </section>

        {/* Report Download */}
        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Transparency Report</h2>
          <a
            href={`/api/report?memo=${encodeURIComponent(memo)}&account=${encodeURIComponent(
              process.env.NEXT_PUBLIC_NGO_PUBLIC_KEY || ''
            )}`}
            className="inline-block px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
            download
          >
            Download PDF Report
          </a>
        </section>

        {/* Result Banner */}
        {result && (
          <div
            className={`rounded-xl p-4 text-sm font-medium ${
              result.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {result.ok ? (
              result.hash ? (
                <>
                  ✅ Distributed!{' '}
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {result.hash}
                  </a>
                </>
              ) : (
                <>✅ Wallet created: <code className="break-all">{result.publicKey}</code></>
              )
            ) : (
              <>❌ {JSON.stringify(result.error)}</>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
