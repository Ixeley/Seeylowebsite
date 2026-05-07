/**
 * GoLiveModal — two-step flow to connect a real Tradovate account.
 *
 * Step 1 — Enter credentials:
 *   Username / Password / Client ID / Secret Key
 *   Demo mode toggle
 *   "Test Connection" button → hits POST /api/test-connection
 *   Shows clear error if auth fails
 *
 * Step 2 — Confirm & select account:
 *   Lists all accounts returned by Tradovate
 *   User picks which account to trade on (firms often have multiple)
 *   Optional: override starting balance (to match risk engine to real balance)
 *   "Connect Live" / "Connect Demo" button → hits POST /api/connect
 *
 * Where to find credentials:
 *   Log in at  https://trader.tradovate.com
 *   Go to  Account → API → Applications → Create App
 *   Copy  Client ID (cid) and  Secret (sec)
 */
import { useState } from 'react';

const FIELD_CLS = `w-full bg-dark-700 border border-dark-400 rounded-lg px-3 py-2 text-sm text-white
  placeholder-gray-600 focus:outline-none focus:border-neon-cyan transition-colors font-mono`;

export default function GoLiveModal({ connecting, onConnect, onClose }) {
  const [step,     setStep]     = useState(1);
  const [testing,  setTesting]  = useState(false);
  const [testErr,  setTestErr]  = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [userId,   setUserId]   = useState(null);

  const [creds, setCreds] = useState({
    username: '', password: '', cid: '', sec: '',
    appId: 'PropTraderDashboard', appVersion: '1.0',
    demo: false,
  });

  // Account selected in step 2 and optional balance override
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [balanceOverride,   setBalanceOverride]    = useState('');

  const set = (k, v) => { setCreds(p => ({ ...p, [k]: v })); setTestErr(null); };

  // ─── Step 1: Test credentials ─────────────────────────────────────────────
  const handleTest = async () => {
    setTesting(true);
    setTestErr(null);
    try {
      const resp = await fetch('/api/test-connection', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ credentials: creds }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error);

      setAccounts(data.accounts);
      setUserId(data.userId);
      setSelectedAccountId(data.accounts[0]?.id ?? null);
      setStep(2);
    } catch (err) {
      setTestErr(err.message);
    } finally {
      setTesting(false);
    }
  };

  // ─── Step 2: Go live ──────────────────────────────────────────────────────
  const handleGoLive = () => {
    const finalCreds = {
      ...creds,
      accountId: selectedAccountId,
    };
    const settings = balanceOverride
      ? { accountBalance: parseFloat(balanceOverride) }
      : {};
    onConnect({ credentials: finalCreds, settings });
  };

  const canTest = creds.username && creds.password && creds.cid && creds.sec;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="neon-card w-full max-w-lg border border-neon-green/30 shadow-neon-green animate-fadeIn relative scan-lines">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="text-neon-green text-xl font-bold text-glow-green">
              {step === 1 ? '⚡ Connect Tradovate Account' : '✅ Account Confirmed'}
            </h2>
            <p className="text-gray-500 text-xs mt-1">
              Step {step} of 2 — {step === 1 ? 'Enter credentials' : 'Select account & go live'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none ml-4">✕</button>
        </div>

        {/* ── Step 1: Credentials form ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Demo / Live toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-lg border border-dark-400 bg-dark-700/50">
              <div
                onClick={() => set('demo', !creds.demo)}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  creds.demo ? 'bg-neon-cyan/30 border-neon-cyan' : 'bg-neon-pink/20 border-neon-pink/60'
                } border`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform bg-white/90 shadow ${
                  creds.demo ? 'translate-x-5' : ''
                }`} />
              </div>
              <div className="flex-1">
                {creds.demo ? (
                  <p className="text-neon-cyan text-sm font-bold">Demo mode — Tradovate demo server</p>
                ) : (
                  <p className="text-neon-pink text-sm font-bold">⚠️ LIVE mode — REAL money at risk</p>
                )}
                <p className="text-gray-500 text-xs">
                  {creds.demo
                    ? 'Uses demo.tradovateapi.com — safe for testing'
                    : 'Uses live.tradovateapi.com — real orders'}
                </p>
              </div>
            </label>

            {/* Username + Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Username</label>
                <input className={FIELD_CLS} placeholder="Tradovate username"
                  value={creds.username} onChange={e => set('username', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Password</label>
                <input className={FIELD_CLS} type="password" placeholder="Tradovate password"
                  value={creds.password} onChange={e => set('password', e.target.value)} />
              </div>
            </div>

            {/* CID + SEC */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                  Client ID <span className="text-gray-600 normal-case">(cid)</span>
                </label>
                <input className={FIELD_CLS} placeholder="e.g. 12345"
                  value={creds.cid} onChange={e => set('cid', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                  Secret <span className="text-gray-600 normal-case">(sec)</span>
                </label>
                <input className={FIELD_CLS} type="password" placeholder="Secret key"
                  value={creds.sec} onChange={e => set('sec', e.target.value)} />
              </div>
            </div>

            {/* Where to find credentials */}
            <div className="bg-dark-700/60 border border-dark-400 rounded-lg p-3 text-xs text-gray-500 space-y-1">
              <p className="text-gray-300 font-bold">Where to find Client ID &amp; Secret:</p>
              <p>1. Log in to <span className="text-neon-cyan">trader.tradovate.com</span></p>
              <p>2. Go to <span className="text-white">Account → API → Applications</span></p>
              <p>3. Click <span className="text-white">Create Application</span></p>
              <p>4. Copy the <span className="text-neon-cyan">Client ID (cid)</span> and <span className="text-neon-cyan">Secret (sec)</span></p>
            </div>

            {/* Error */}
            {testErr && (
              <div className="bg-neon-pink/10 border border-neon-pink/40 rounded-lg px-3 py-2 text-neon-pink text-sm">
                ❌ {testErr}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-dark-400 text-gray-400 hover:text-white text-sm transition-colors">
                Cancel
              </button>
              <button
                onClick={handleTest}
                disabled={!canTest || testing}
                className={`flex-2 flex-grow py-2.5 rounded-lg font-bold text-sm transition-all
                  ${creds.demo
                    ? 'bg-neon-cyan/20 border border-neon-cyan/60 text-neon-cyan hover:shadow-neon-cyan'
                    : 'bg-neon-green/20 border border-neon-green/60 text-neon-green hover:shadow-neon-green'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {testing ? '⏳ Testing…' : '🔌 Test Connection'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Account selection ────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Success banner */}
            <div className="bg-neon-green/10 border border-neon-green/40 rounded-lg px-4 py-3">
              <p className="text-neon-green font-bold text-sm text-glow-green">
                ✅ Authentication successful
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                {creds.demo ? '🔵 Demo server' : '🔴 Live server'} · User ID: {userId}
              </p>
            </div>

            {/* Account picker */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">
                Select Account ({accounts.length} found)
              </label>
              <div className="space-y-2">
                {accounts.map(acc => (
                  <label
                    key={acc.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedAccountId === acc.id
                        ? 'border-neon-green/60 bg-neon-green/10'
                        : 'border-dark-400 bg-dark-700/50 hover:border-dark-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="account"
                      value={acc.id}
                      checked={selectedAccountId === acc.id}
                      onChange={() => setSelectedAccountId(acc.id)}
                      className="accent-neon-green"
                    />
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">{acc.name}</p>
                      <p className="text-gray-500 text-xs">ID: {acc.id} · {acc.accountType} · {acc.active ? 'Active' : 'Inactive'}</p>
                    </div>
                    {!acc.active && (
                      <span className="text-xs text-neon-orange border border-neon-orange/40 px-2 py-0.5 rounded">Inactive</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Balance override (for risk engine seed) */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
                Starting Balance Override <span className="text-gray-600 normal-case">(optional — defaults to $50,000)</span>
              </label>
              <input
                className={FIELD_CLS}
                type="number"
                placeholder="Leave blank to use default risk settings"
                value={balanceOverride}
                onChange={e => setBalanceOverride(e.target.value)}
              />
              <p className="text-gray-600 text-xs mt-1">
                Used to seed the risk engine. Match this to your actual Tradovate account balance.
              </p>
            </div>

            {/* Mode reminder */}
            <div className={`rounded-lg px-3 py-2 text-xs border ${
              creds.demo
                ? 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan'
                : 'bg-neon-pink/10 border-neon-pink/40 text-neon-pink font-bold'
            }`}>
              {creds.demo
                ? '🔵 Connecting to Tradovate DEMO server — no real orders'
                : '⚠️  LIVE MODE — real orders will be placed on this account'}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-lg border border-dark-400 text-gray-400 hover:text-white text-sm transition-colors">
                ← Back
              </button>
              <button
                onClick={handleGoLive}
                disabled={!selectedAccountId || connecting}
                className={`flex-1 py-2.5 rounded-lg font-bold text-sm tracking-wide transition-all
                  ${creds.demo
                    ? 'bg-neon-cyan/20 border border-neon-cyan/60 text-neon-cyan hover:shadow-neon-cyan'
                    : 'bg-neon-green/20 border border-neon-green/60 text-neon-green hover:shadow-neon-green'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {connecting
                  ? '⏳ Connecting…'
                  : creds.demo
                    ? '🔵 Connect Demo Account'
                    : '🔴 Connect Live Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
