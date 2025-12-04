import { useEffect, useRef, memo } from "react";
import { useTheme } from "@mui/material/styles";

type TradingViewTickerTapeProps = {
  symbols?: { proName: string; title: string }[];
  transparent?: boolean;
  displayMode?: "regular" | "compact" | "adaptive";
};

const DEFAULT_SYMBOLS: { proName: string; title: string }[] = [
  { proName: "FOREXCOM:SPXUSD", title: "S&P 500 Index" },
  { proName: "FOREXCOM:NSXUSD", title: "US 100 Cash CFD" },
  { proName: "FX_IDC:EURUSD", title: "EUR to USD" },
  { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
  { proName: "BITSTAMP:ETHUSD", title: "Ethereum" },
  { proName: "OANDA:XAUUSD", title: "Gold" },
  { proName: "MCX:CRUDEOIL1!", title: "Crude Oil" },
  { proName: "PEPPERSTONE:NAS100", title: "NAS100" },
];

function TradingViewTickerTape({
  symbols = DEFAULT_SYMBOLS,
  transparent = true,
  displayMode = "adaptive",
}: TradingViewTickerTapeProps) {
  const container = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const colorTheme = theme.palette.mode === "light" ? "light" : "dark";

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "symbols": ${JSON.stringify(symbols)},
        "colorTheme": "${colorTheme}",
        "locale": "en",
        "largeChartUrl": "",
        "isTransparent": ${transparent},
        "showSymbolLogo": true,
        "displayMode": "${displayMode}"
      }`;
    container.current.appendChild(script);
  }, [colorTheme, symbols, transparent, displayMode]);

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget" />
      <div className="tradingview-widget-copyright">
        <a href="https://www.tradingview.com/markets/" rel="noopener nofollow" target="_blank">
          <span className="blue-text">Ticker tape</span>
        </a>
        <span className="trademark"> by TradingView</span>
      </div>
    </div>
  );
}

export default memo(TradingViewTickerTape);
