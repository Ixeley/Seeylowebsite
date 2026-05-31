/**
 * TradingViewWidget — embeds the free TradingView Advanced Chart.
 *
 * The chart is loaded via TradingView's public script (no API key needed).
 * It shows the REAL market price so the trader has proper market context
 * even in paper trading mode.
 *
 * Default symbol: CME_MINI:ES1! (E-mini S&P 500 continuous contract)
 * The user can change the symbol via the props.
 *
 * Cleanup: the widget iframe and script are removed on unmount to avoid
 * duplicate instances during React hot-reload or tab switches.
 */
import { useEffect, useRef } from 'react';

const TV_SCRIPT_SRC = 'https://s3.tradingview.com/tv.js';
const CONTAINER_ID  = 'tv-advanced-chart';

export default function TradingViewWidget({
  symbol   = 'CME_MINI:ES1!',
  interval = '5',           // '1' '5' '15' '60' 'D'
  height   = 420,
}) {
  const containerRef = useRef(null);
  const widgetRef    = useRef(null);

  useEffect(() => {
    // If the TradingView library is already loaded, create the widget directly.
    // Otherwise inject the script tag once and create on load.
    function createWidget() {
      if (!window.TradingView || !containerRef.current) return;

      // Clean up any previous instance
      containerRef.current.innerHTML = '';

      widgetRef.current = new window.TradingView.widget({
        container_id:      CONTAINER_ID,
        autosize:          true,
        symbol,
        interval,
        timezone:          'America/New_York',
        theme:             'dark',
        style:             '1',         // candlestick
        locale:            'en',
        toolbar_bg:        '#07071a',
        backgroundColor:   '#07071a',
        gridColor:         'rgba(26, 26, 62, 0.6)',
        enable_publishing: false,
        hide_top_toolbar:  false,
        hide_legend:       false,
        save_image:        false,
        withdateranges:    false,
        allow_symbol_change: true,
        studies:           [
          // Show SMA 9 and SMA 21 — matches the strategy running on the backend
          { id: 'MASimple@tv-basicstudies', inputs: { length: 9  }, styles: { plot: { color: '#00e5ff', linewidth: 1 } } },
          { id: 'MASimple@tv-basicstudies', inputs: { length: 21 }, styles: { plot: { color: '#ff2d9b', linewidth: 1 } } },
        ],
        overrides: {
          'paneProperties.background':           '#07071a',
          'paneProperties.vertGridProperties.color': 'rgba(26,26,62,0.5)',
          'paneProperties.horzGridProperties.color': 'rgba(26,26,62,0.5)',
          'scalesProperties.textColor':          '#6b7280',
          'mainSeriesProperties.candleStyle.upColor':         '#00ff88',
          'mainSeriesProperties.candleStyle.downColor':       '#ff2d9b',
          'mainSeriesProperties.candleStyle.borderUpColor':   '#00ff88',
          'mainSeriesProperties.candleStyle.borderDownColor': '#ff2d9b',
          'mainSeriesProperties.candleStyle.wickUpColor':     '#00ff8877',
          'mainSeriesProperties.candleStyle.wickDownColor':   '#ff2d9b77',
        },
        loading_screen: { backgroundColor: '#07071a', foregroundColor: '#00e5ff' },
      });
    }

    if (window.TradingView) {
      createWidget();
    } else {
      // Avoid adding duplicate script tags
      if (!document.querySelector(`script[src="${TV_SCRIPT_SRC}"]`)) {
        const script  = document.createElement('script');
        script.src    = TV_SCRIPT_SRC;
        script.async  = true;
        script.onload = createWidget;
        document.head.appendChild(script);
      } else {
        // Script tag exists but may not have fired onload yet — poll briefly
        const poll = setInterval(() => {
          if (window.TradingView) { clearInterval(poll); createWidget(); }
        }, 100);
      }
    }

    return () => {
      // Wipe the iframe content on unmount (widget has no public destroy() API)
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [symbol, interval]);

  return (
    <div className="neon-card p-0 overflow-hidden relative" style={{ height }}>
      {/* Header bar above the chart */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-dark-500 bg-dark-800">
        <div className="flex items-center gap-3">
          <span className="text-neon-cyan text-sm font-bold text-glow-cyan">📊 TradingView</span>
          <span className="text-gray-400 text-xs">{symbol}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="live-dot" style={{ width: 6, height: 6 }} />
          <span className="text-neon-green">Real Market Data</span>
        </div>
      </div>

      {/* TradingView mounts here */}
      <div
        id={CONTAINER_ID}
        ref={containerRef}
        style={{ height: height - 44, width: '100%' }}
      />
    </div>
  );
}
