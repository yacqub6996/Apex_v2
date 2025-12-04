import { useEffect, useRef, memo } from "react";
import { useTheme } from "@mui/material/styles";

type TradingViewTechnicalAnalysisProps = {
  symbol?: string;
  interval?: string;
  width?: string;
  height?: string;
  transparent?: boolean;
};

function TradingViewTechnicalAnalysis({
  symbol = "OANDA:XAUUSD",
  interval = "5m",
  width = "100%",
  height = "100%",
  transparent = true,
}: TradingViewTechnicalAnalysisProps) {
  const container = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const colorTheme = theme.palette.mode === "light" ? "light" : "dark";

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "symbol": "${symbol}",
        "colorTheme": "${colorTheme}",
        "isTransparent": ${transparent},
        "locale": "en",
        "width": "${width}",
        "height": "${height}",
        "interval": "${interval}",
        "displayMode": "single",
        "disableInterval": false,
        "showIntervalTabs": true
      }`;
    container.current.appendChild(script);
  }, [colorTheme, symbol, interval, width, height, transparent]);

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget" />
      <div className="tradingview-widget-copyright">
        <a
          href={`https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/`}
          rel="noopener nofollow"
          target="_blank"
        >
          <span className="blue-text">{symbol} analysis</span>
        </a>
        <span className="trademark"> by TradingView</span>
      </div>
    </div>
  );
}

export default memo(TradingViewTechnicalAnalysis);
