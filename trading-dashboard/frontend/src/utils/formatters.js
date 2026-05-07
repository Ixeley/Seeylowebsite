/**
 * Shared formatting helpers used across all components.
 */

export const fmt$ = (n, decimals = 2) => {
  if (n == null) return '—';
  const abs = Math.abs(n);
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return n < 0 ? `-$${str}` : `+$${str}`;
};

export const fmtPrice = (n) =>
  n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtPct = (n, decimals = 1) =>
  n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;

export const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const pnlColor = (n) => {
  if (n == null) return 'text-gray-400';
  if (n > 0) return 'text-neon-green text-glow-green';
  if (n < 0) return 'text-neon-pink  text-glow-pink';
  return 'text-gray-400';
};

export const pnlBg = (n) => {
  if (n == null) return '';
  if (n > 0) return 'bg-neon-green/10 border-neon-green/30';
  if (n < 0) return 'bg-neon-pink/10  border-neon-pink/30';
  return 'bg-dark-700 border-dark-500';
};

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
