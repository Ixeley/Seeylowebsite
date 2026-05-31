/**
 * RiskSettings — editable form for all prop-firm risk parameters.
 *
 * Changes only take effect when the user clicks "Apply & Reconnect",
 * which re-posts /api/connect with the new settings.  This ensures
 * the risk engine resets correctly rather than partially updating.
 */
import { useState } from 'react';

export default function RiskSettings({ settings, onChange, onReconnect }) {
  const [draft, setDraft] = useState({ ...settings });
  const [saved, setSaved] = useState(false);

  const update = (key, raw) => {
    const val = key === 'consistencyRule' ? parseFloat(raw) : parseFloat(raw);
    if (!isNaN(val)) {
      setDraft(prev => ({ ...prev, [key]: val }));
    }
    setSaved(false);
  };

  const handleApply = () => {
    onChange(draft);
    onReconnect(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const fields = [
    {
      key:   'accountBalance',
      label: 'Account Balance ($)',
      hint:  'Your prop firm funded account size',
      min:   1000,
      step:  1000,
    },
    {
      key:   'profitTarget',
      label: 'Daily Profit Target ($)',
      hint:  'Auto-stop when this profit is reached (e.g. $1,000 = 2% on $50k)',
      min:   100,
      step:  100,
    },
    {
      key:   'dailyLossLimit',
      label: 'Daily Loss Limit ($)',
      hint:  'Hard stop-out if losses reach this amount',
      min:   100,
      step:  100,
    },
    {
      key:   'trailingMaxLoss',
      label: 'Trailing Max Loss ($)',
      hint:  'Account must never fall more than this below its high-water mark',
      min:   500,
      step:  500,
    },
    {
      key:   'consistencyRule',
      label: 'Consistency Rule (fraction)',
      hint:  'Max fraction of daily profit target from a single trade (0.30 = 30%)',
      min:   0.05,
      step:  0.05,
      max:   1,
    },
    {
      key:   'maxPositions',
      label: 'Max Open Contracts',
      hint:  'Maximum number of concurrent positions',
      min:   1,
      step:  1,
      max:   10,
    },
  ];

  return (
    <div className="neon-card max-w-2xl space-y-6 relative scan-lines">
      <div>
        <h3 className="text-neon-cyan font-bold text-glow-cyan">Risk Settings</h3>
        <p className="text-gray-500 text-xs mt-1">
          Changes take effect after clicking <strong>Apply &amp; Reconnect</strong>.
          The risk engine will reset to the new parameters.
        </p>
      </div>

      <div className="space-y-4">
        {fields.map(f => (
          <div key={f.key} className="space-y-1">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              {f.label}
            </label>
            <input
              type="number"
              value={draft[f.key]}
              min={f.min}
              max={f.max}
              step={f.step}
              onChange={e => update(f.key, e.target.value)}
              className="w-full bg-dark-700 border border-dark-400 rounded-lg px-3 py-2 text-white
                         text-sm focus:outline-none focus:border-neon-cyan transition-colors
                         placeholder-gray-600 tabular-nums"
            />
            <p className="text-xs text-gray-600">{f.hint}</p>
          </div>
        ))}
      </div>

      {/* Quick presets */}
      <div>
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Quick Presets</p>
        <div className="flex flex-wrap gap-2">
          {[
            { name: 'FTMO $10k',   bal: 10_000, profit: 1_000, loss: 500,  trailing: 1_000 },
            { name: 'FTMO $50k',   bal: 50_000, profit: 2_500, loss: 2_500, trailing: 5_000 },
            { name: 'Topstep $50k', bal: 50_000, profit: 1_000, loss: 500,  trailing: 2_000 },
            { name: 'Conservative', bal: 50_000, profit: 500,   loss: 250,  trailing: 1_000 },
          ].map(p => (
            <button
              key={p.name}
              onClick={() => setDraft(prev => ({
                ...prev,
                accountBalance:  p.bal,
                profitTarget:    p.profit,
                dailyLossLimit:  p.loss,
                trailingMaxLoss: p.trailing,
              }))}
              className="text-xs px-3 py-1.5 rounded-lg border border-neon-purple/40 bg-neon-purple/10
                         text-neon-purple hover:bg-neon-purple/20 transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Current effective settings preview */}
      <div className="border-t border-dark-500 pt-4 grid grid-cols-2 gap-2 text-xs">
        {Object.entries(draft).map(([k, v]) => (
          <div key={k} className="flex justify-between text-gray-400">
            <span className="text-gray-500">{k}</span>
            <span className="text-neon-cyan tabular-nums">{v}</span>
          </div>
        ))}
      </div>

      {/* Apply button */}
      <button
        onClick={handleApply}
        className="w-full py-3 rounded-xl font-bold text-dark-900 bg-neon-cyan
                   hover:shadow-neon-cyan transition-all text-sm tracking-widest"
      >
        {saved ? '✅ Applied!' : '⚡ Apply & Reconnect'}
      </button>

      <p className="text-gray-600 text-xs text-center">
        ⚠️ Applying will reset the daily P&L counter and risk engine state.
      </p>
    </div>
  );
}
