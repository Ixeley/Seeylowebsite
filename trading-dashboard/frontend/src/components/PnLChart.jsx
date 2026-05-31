/**
 * PnLChart — real-time equity curve using Recharts.
 *
 * Shows the rolling daily P&L line with neon green/red colouring,
 * reference lines for the profit target and daily loss limit, and
 * a gradient fill beneath the curve.
 */
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import { fmt$, fmtTime } from '../utils/formatters';

export default function PnLChart({ pnlHistory, riskState }) {
  const data = pnlHistory.map((p, i) => ({
    index: i,
    pnl:   +p.value.toFixed(2),
    time:  p.time,
  }));

  const target  =  riskState?.profitTarget  ??  1000;
  const lossLim = -(riskState?.dailyLossLimit ?? 500);
  const lastPnL =  data.at(-1)?.pnl ?? 0;
  const isProfit = lastPnL >= 0;

  return (
    <div className="neon-card h-72 relative scan-lines">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-neon-cyan text-sm font-bold text-glow-cyan">
          Daily P&amp;L — Equity Curve
        </h3>
        <span className={`text-xl font-bold tabular-nums ${isProfit ? 'text-neon-green text-glow-green' : 'text-neon-pink text-glow-pink'}`}>
          {fmt$(lastPnL)}
        </span>
      </div>

      {data.length < 2 ? (
        <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
          Waiting for price data…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              {/* Gradient fill — green above zero, fades to transparent */}
              <linearGradient id="pnlGradientPos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00ff88" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00ff88" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="pnlGradientNeg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ff2d9b" stopOpacity={0.01} />
                <stop offset="95%" stopColor="#ff2d9b" stopOpacity={0.3} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a45" vertical={false} />

            <XAxis
              dataKey="index"
              tick={false}
              axisLine={{ stroke: '#1a1a45' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${v}`}
              tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              width={55}
            />

            {/* Profit target — neon green dashed */}
            <ReferenceLine
              y={target}
              stroke="#00ff88"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{ value: `Target $${target}`, fill: '#00ff88', fontSize: 10, position: 'insideTopRight' }}
            />

            {/* Loss limit — neon pink dashed */}
            <ReferenceLine
              y={lossLim}
              stroke="#ff2d9b"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{ value: `Limit -$${Math.abs(lossLim)}`, fill: '#ff2d9b', fontSize: 10, position: 'insideBottomRight' }}
            />

            {/* Zero line */}
            <ReferenceLine y={0} stroke="#ffffff18" strokeWidth={1} />

            <Tooltip
              contentStyle={{
                background: '#07071a',
                border: '1px solid #00e5ff44',
                borderRadius: '8px',
                fontSize: 12,
                fontFamily: 'monospace',
              }}
              labelFormatter={(idx) => data[idx] ? fmtTime(data[idx].time) : ''}
              formatter={(v) => [fmt$(v), 'P&L']}
              cursor={{ stroke: '#00e5ff44', strokeWidth: 1 }}
            />

            <Area
              type="monotone"
              dataKey="pnl"
              stroke={isProfit ? '#00ff88' : '#ff2d9b'}
              strokeWidth={2}
              fill={isProfit ? 'url(#pnlGradientPos)' : 'url(#pnlGradientNeg)'}
              dot={false}
              activeDot={{ r: 4, fill: isProfit ? '#00ff88' : '#ff2d9b', stroke: '#04040f', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
