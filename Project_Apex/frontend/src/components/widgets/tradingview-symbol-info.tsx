import { useEffect, useRef, memo } from "react";
import { useTheme } from "@mui/material/styles";

type TradingViewSymbolInfoProps = {
  symbol?: string;
  transparent?: boolean;
  width?: string;
};

function TradingViewSymbolInfo({
  symbol = "OANDA:XAUUSD",
  transparent = true,
  width = "100%",
}: TradingViewSymbolInfoProps) {
  const container = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const colorTheme = theme.palette.mode === "light" ? "light" : "dark";

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "symbol": "${symbol}",
        "colorTheme": "${colorTheme}",
        "isTransparent": ${transparent},
        "locale": "en",
        "width": "${width}"
      }`;
    container.current.appendChild(script);
  }, [colorTheme, symbol, transparent, width]);

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget" />
      <div className="tradingview-widget-copyright">
        <a
          href={`https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/`}
          rel="noopener nofollow"
          target="_blank"
        >
          <span className="blue-text">{symbol} performance</span>
        </a>
        <span className="trademark"> by TradingView</span>
      </div>
    </div>
  );
}

export default memo(TradingViewSymbolInfo);
