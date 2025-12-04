import { useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface TradingViewWidgetOptions {
    symbol?: string;
    interval?: string;
}

declare global {
    interface Window {
        TradingView?: {
            widget: (options: Record<string, unknown>) => void;
        };
    }
}

const TRADINGVIEW_SCRIPT_ID = "tradingview-widget-script";

export const TradingViewCard = ({
    symbol = "NASDAQ:TSLA",
    interval = "60",
}: TradingViewWidgetOptions) => {
    const theme = useTheme();
    const containerId = useMemo(() => `tradingview-container-${Math.random().toString(36).slice(2)}`, []);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }

        const cleanup = () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }
        };

        const createWidget = () => {
            if (!window.TradingView || !containerRef.current) {
                return;
            }

            window.TradingView.widget({
                autosize: true,
                symbol,
                interval,
                timezone: "Etc/UTC",
                theme: theme.palette.mode === "dark" ? "dark" : "light",
                style: "1",
                locale: "en",
                toolbar_bg: "rgba(0, 0, 0, 0)",
                hide_top_toolbar: false,
                hide_legend: false,
                hide_side_toolbar: true,
                allow_symbol_change: true,
                container_id: containerId,
            });
        };

        const existingScript = document.getElementById(TRADINGVIEW_SCRIPT_ID) as HTMLScriptElement | null;

        if (existingScript) {
            if (window.TradingView) {
                createWidget();
            } else {
                existingScript.addEventListener("load", createWidget, { once: true });
            }
        } else {
            const script = document.createElement("script");
            script.id = TRADINGVIEW_SCRIPT_ID;
            script.src = "https://s3.tradingview.com/tv.js";
            script.type = "text/javascript";
            script.onload = createWidget;
            document.body.appendChild(script);
        }

        return cleanup;
    }, [containerId, interval, symbol, theme.palette.mode]);

    const widgetAvailable = typeof window !== "undefined" && Boolean(window.TradingView);

    return (
        <Card variant="outlined" sx={{ borderRadius: 2, height: "100%" }}>
            <CardHeader title="Market snapshot" subheader={`Live TradingView chart for ${symbol}`} />
            <CardContent>
                <Box sx={{ height: 320 }}>
                    <Box id={containerId} ref={containerRef} sx={{ height: "100%" }} />
                    {!widgetAvailable ? (
                        <Typography variant="caption" color="text.secondary">
                            Chart will load once the TradingView widget script is available.
                        </Typography>
                    ) : null}
                </Box>
            </CardContent>
        </Card>
    );
};

