import { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  compact?: boolean;
}

function TradingViewWidget({ compact = false }: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(
    () => {
      if (container.current) {
        // Clear any existing content
        container.current.innerHTML = '';
        
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-hotlists.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = `
          {
            "exchange": "US",
            "colorTheme": "dark",
            "dateRange": "${compact ? '1D' : '12M'}",
            "showChart": ${compact ? 'true' : 'false'},
            "locale": "en",
            "largeChartUrl": "",
            "isTransparent": true,
            "showSymbolLogo": false,
            "showFloatingTooltip": true,
            ${compact ? '"width": "100%", "height": "300"' : '"width": "100%", "height": "100%"'}
          }`;
        container.current.appendChild(script);
      }
    },
    [compact]
  );

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
      <div className="tradingview-widget-copyright">
        <a href="https://www.tradingview.com/markets/" rel="noopener nofollow" target="_blank">
          <span className="blue-text">Ticker tape</span>
        </a>
        <span className="trademark"> by TradingView</span>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);

