import { useState } from 'react';
import { isInsideGeofence, getCurrentPosition } from '../lib/geofence';

// Example disaster zone polygon — replace with dynamic data from your NGO dashboard
const DISASTER_ZONE = [
  { lat: 6.45, lng: 3.39 },
  { lat: 6.45, lng: 3.45 },
  { lat: 6.40, lng: 3.45 },
  { lat: 6.40, lng: 3.39 },
];

export default function ClaimPage() {
  const [status, setStatus] = useState('idle'); // idle | checking | allowed | denied | claimed | error
  const [txHash, setTxHash] = useState('');

  async function handleClaim() {
    setStatus('checking');
    try {
      const pos = await getCurrentPosition();
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (!isInsideGeofence(point, DISASTER_ZONE)) {
        return setStatus('denied');
      }
      setStatus('allowed');

      // Retrieve the recipient's secret from local storage (set during wallet setup)
      const secret = localStorage.getItem('walletSecret');
      if (!secret) return setStatus('error');

      // Submit claim via offline-queue-aware fetch
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTxHash(data.hash);
      setStatus('claimed');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm text-center space-y-4">
        <h1 className="text-2xl font-bold text-blue-700">Crisis Aid Claim</h1>
        <p className="text-gray-500 text-sm">
          You must be within the designated disaster zone to claim your aid.
        </p>

        {status === 'denied' && (
          <p className="text-red-500 font-medium">
            ❌ You are outside the disaster zone. Move closer to claim.
          </p>
        )}
        {status === 'claimed' && (
          <p className="text-green-600 font-medium break-all">
            ✅ Aid claimed!{' '}
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              View on chain
            </a>
          </p>
        )}
        {status === 'error' && (
          <p className="text-red-500 font-medium">Something went wrong. Try again.</p>
        )}

        <button
          onClick={handleClaim}
          disabled={['checking', 'claimed'].includes(status)}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50 hover:bg-blue-700 transition"
        >
          {status === 'checking' ? 'Verifying location…' : 'Claim My Aid'}
        </button>
      </div>
    </main>
  );
}
