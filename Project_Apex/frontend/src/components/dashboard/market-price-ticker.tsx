import { Box, Chip, Stack, Typography, useTheme, Skeleton } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

export interface MarketPrice {
    symbol: string;
    displayName: string;
    price: number;
    change: number;
    changePercent: number;
}

export interface MarketPriceTickerProps {
    /**
     * Array of market price data
     */
    prices: MarketPrice[];
    
    /**
     * Loading state
     */
    isLoading?: boolean;
    
    /**
     * Compact mode (smaller size)
     */
    compact?: boolean;
}

/**
 * Format price with appropriate precision based on value magnitude
 */
function formatPrice(price: number): string {
    if (price >= 1000) {
        // For large prices (e.g., Bitcoin), use 2 decimal places
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(price);
    } else if (price >= 1) {
        // For medium prices, use 2-4 decimal places
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
        }).format(price);
    } else {
        // For small prices (e.g., altcoins), use more precision
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 4,
            maximumFractionDigits: 6,
        }).format(price);
    }
}

/**
 * MarketPriceTicker - Native market price display component
 * 
 * Displays real-time market prices in a clean, theme-aware format.
 * Replaces external Finlogix widgets with a native solution.
 */
export const MarketPriceTicker = ({
    prices,
    isLoading = false,
    compact = false,
}: MarketPriceTickerProps) => {
    const theme = useTheme();
    
    if (isLoading) {
        return (
            <Stack 
                direction="row" 
                spacing={1.5} 
                sx={{ 
                    overflowX: "auto",
                    py: compact ? 1 : 1.25,
                    px: { xs: 1.5, sm: 2 },
                    "&::-webkit-scrollbar": {
                        height: 4,
                    },
                    "&::-webkit-scrollbar-track": {
                        backgroundColor: "transparent",
                    },
                    "&::-webkit-scrollbar-thumb": {
                        backgroundColor: theme.palette.divider,
                        borderRadius: 2,
                    },
                }}
            >
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton 
                        key={i} 
                        variant="rectangular" 
                        width={compact ? 100 : 140} 
                        height={compact ? 32 : 40}
                        sx={{ borderRadius: 1 }}
                    />
                ))}
            </Stack>
        );
    }
    
    if (!prices || prices.length === 0) {
        return null;
    }
    
    return (
        <Stack 
            direction="row" 
            spacing={1.5} 
            sx={{ 
                overflowX: "auto",
                py: compact ? 1 : 1.25,
                px: { xs: 1.5, sm: 2 },
                bgcolor: "background.paper",
                borderBottom: 1,
                borderColor: "divider",
                "&::-webkit-scrollbar": {
                    height: 4,
                },
                "&::-webkit-scrollbar-track": {
                    backgroundColor: "transparent",
                },
                "&::-webkit-scrollbar-thumb": {
                    backgroundColor: theme.palette.divider,
                    borderRadius: 2,
                },
            }}
        >
            {prices.map((price) => {
                const isPositive = price.change >= 0;
                const color = isPositive ? "success" : "error";
                
                return (
                    <Box
                        key={price.symbol}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            px: compact ? 1.5 : 2,
                            py: compact ? 0.5 : 0.75,
                            borderRadius: 1,
                            bgcolor: `${color}.${theme.palette.mode === "dark" ? "dark" : "light"}`,
                            border: 1,
                            borderColor: `${color}.${theme.palette.mode === "dark" ? "main" : "light"}`,
                            minWidth: compact ? 100 : 140,
                            transition: "all 0.2s ease-in-out",
                            "&:hover": {
                                boxShadow: 1,
                                transform: "translateY(-1px)",
                            },
                        }}
                    >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography 
                                variant={compact ? "caption" : "body2"} 
                                sx={{ 
                                    fontWeight: 600,
                                    color: "text.primary",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                {price.displayName}
                            </Typography>
                            <Typography 
                                variant="caption"
                                sx={{ 
                                    color: `${color}.${theme.palette.mode === "dark" ? "light" : "main"}`,
                                    fontWeight: 500,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                }}
                            >
                                {isPositive ? (
                                    <TrendingUpIcon sx={{ fontSize: compact ? 12 : 14 }} />
                                ) : (
                                    <TrendingDownIcon sx={{ fontSize: compact ? 12 : 14 }} />
                                )}
                                {isPositive ? "+" : ""}{price.changePercent.toFixed(2)}%
                            </Typography>
                        </Box>
                        <Typography 
                            variant={compact ? "body2" : "body1"} 
                            sx={{ 
                                fontWeight: 600,
                                color: "text.primary",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {formatPrice(price.price)}
                        </Typography>
                    </Box>
                );
            })}
        </Stack>
    );
};

/**
 * MarketPriceChips - Compact chip-based market price display
 * 
 * Alternative display format using MUI chips for tighter spaces
 */
export const MarketPriceChips = ({
    prices,
    isLoading = false,
}: MarketPriceTickerProps) => {
    if (isLoading) {
        return (
            <Stack direction="row" spacing={1} flexWrap="wrap">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton 
                        key={i} 
                        variant="rectangular" 
                        width={100} 
                        height={24}
                        sx={{ borderRadius: 3 }}
                    />
                ))}
            </Stack>
        );
    }
    
    if (!prices || prices.length === 0) {
        return null;
    }
    
    return (
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
            {prices.map((price) => {
                const isPositive = price.change >= 0;
                const color = isPositive ? "success" : "error";
                
                return (
                    <Chip
                        key={price.symbol}
                        label={
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                    {price.displayName}:
                                </Typography>
                                <Typography variant="caption">
                                    {formatPrice(price.price)}
                                </Typography>
                                <Typography 
                                    variant="caption" 
                                    sx={{ 
                                        color: `${color}.main`,
                                        fontWeight: 500,
                                    }}
                                >
                                    {isPositive ? "+" : ""}{price.changePercent.toFixed(1)}%
                                </Typography>
                            </Box>
                        }
                        size="small"
                        color={color}
                        variant="outlined"
                        icon={
                            isPositive ? (
                                <TrendingUpIcon sx={{ fontSize: 14 }} />
                            ) : (
                                <TrendingDownIcon sx={{ fontSize: 14 }} />
                            )
                        }
                    />
                );
            })}
        </Stack>
    );
};
