import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    Widget?: {
      init: (config: Record<string, any>) => void;
    };
  }
}

const FINLOGIX_SRC = 'https://widget.finlogix.com/Widget.js';
let finlogixScriptLoading: Promise<void> | null = null;

function loadFinlogixScript() {
  if (window.Widget) return Promise.resolve();
  if (finlogixScriptLoading) return finlogixScriptLoading;
  finlogixScriptLoading = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = FINLOGIX_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.body.appendChild(s);
  });
  return finlogixScriptLoading;
}

type BaseProps = {
  config: Record<string, any>;
  className?: string;
};

export function FinlogixWidgetBase({ config, className }: BaseProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!ref.current || initialized) return;
    const el = ref.current;
    const io = new IntersectionObserver(async (entries) => {
      const visible = entries.some((e) => e.isIntersecting);
      if (!visible) return;
      io.disconnect();
      try {
        await loadFinlogixScript();
        window.Widget?.init(config);
        setInitialized(true);
      } catch (e) {
        // silently ignore in dev
         
        console.warn('Finlogix widget failed to load', e);
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [config, initialized]);

  return <div ref={ref} className={`finlogix-container ${className ?? ''}`.trim()} />;
}

export function FinlogixStripBar() {
  return (
    <FinlogixWidgetBase
      config={{
        type: 'StripBar',
        language: 'en',
        showBrand: true,
        isShowTradeButton: true,
        isShowBeneathLink: true,
        isShowDataFromACYInfo: true,
        symbolPairs: [
          { symbolId: '19', symbolName: 'EURUSD' },
          { symbolId: '36', symbolName: 'USDJPY' },
          { symbolId: '20', symbolName: 'GBPAUD' },
          { symbolId: '44', symbolName: 'XAUUSD' },
          { symbolId: '128', symbolName: 'USWTI' },
          { symbolId: '157', symbolName: 'SP500' },
        ],
        isAdaptive: true,
        withBorderBox: true,
      }}
    />
  );
}

export function FinlogixNewsFeed() {
  return (
    <FinlogixWidgetBase
      config={{
        widgetId: '079e1962-bb13-406b-9c31-85abd32bc849',
        type: 'NewsFeed',
        language: 'en',
        showBrand: true,
        isShowTradeButton: true,
        isShowBeneathLink: true,
        isShowDataFromACYInfo: true,
        isAdaptive: true,
        withBorderBox: true,
      }}
    />
  );
}

export function FinlogixSentiment({ symbolId = '44', symbolName = 'XAUUSD' }: { symbolId?: string; symbolName?: string }) {
  return (
    <FinlogixWidgetBase
      config={{
        widgetId: '079e1962-bb13-406b-9c31-85abd32bc849',
        type: 'Sentiment',
        language: 'en',
        showBrand: true,
        isShowTradeButton: true,
        isShowBeneathLink: true,
        isShowDataFromACYInfo: true,
        symbolPair: { symbolId, symbolName },
        isShowPriceRelatedColumn: false,
        isAdaptive: true,
      }}
    />
  );
}

export function FinlogixCurrencyConverter() {
  return (
    <FinlogixWidgetBase
      config={{
        type: 'CurrencyConverter',
        language: 'en',
        showBrand: true,
        isShowTradeButton: true,
        isShowBeneathLink: true,
        isShowDataFromACYInfo: true,
        isAdaptive: true,
        withBorderBox: true,
      }}
    />
  );
}

