import { useMemo } from "react";
import { Box, Card, CardContent, Typography, useTheme, Skeleton, alpha } from "@mui/material";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

export interface ROIChartProps {
    /**
     * Array of data points with date and ROI value
     */
    data: Array<{ date: string; roi: number; label?: string }>;
    
    /**
     * Title for the chart
     */
    title?: string;
    
    /**
     * Chart height in pixels
     */
    height?: number;
    
    /**
     * Whether to show area fill under the line
     */
    showArea?: boolean;
    
    /**
     * Loading state
     */
    isLoading?: boolean;
    
    /**
     * Prefix for Y-axis values (e.g., "$", "%")
     */
    valuePrefix?: string;
    
    /**
     * Suffix for Y-axis values (e.g., "$", "%")
     */
    valueSuffix?: string;
    
    /**
     * Label for the data series in tooltip (defaults to "Value")
     */
    dataLabel?: string;
}

/**
 * ROIChart - Native performance chart component using Recharts
 * 
 * Displays ROI/performance data over time with automatic theme integration.
 * Replaces external TradingView widgets with a native, customizable solution.
 */
export const ROIChart = ({
    data,
    title = "Performance",
    height = 300,
    showArea = true,
    isLoading = false,
    valuePrefix = "",
    valueSuffix = "%",
    dataLabel = "Value",
}: ROIChartProps) => {
    const theme = useTheme();
    
    // Calculate trend and stats
    const stats = useMemo(() => {
        if (!data || data.length === 0) {
            return { trend: 0, min: 0, max: 0, latest: 0, change: 0 };
        }
        
        const values = data.map(d => d.roi);
        const latest = values[values.length - 1] || 0;
        const previous = values[values.length - 2] || latest;
        const change = latest - previous;
        
        return {
            trend: change >= 0 ? "up" : "down",
            min: Math.min(...values),
            max: Math.max(...values),
            latest,
            change,
        };
    }, [data]);
    
    // Theme-aware colors
    const lineColor = theme.palette.primary.main;
    const gridColor = alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.2 : 0.08);
    const textColor = theme.palette.text.secondary;
    const fillFrom = alpha(theme.palette.primary.main, 0.28);
    const fillTo = alpha(theme.palette.primary.main, 0.05);
    
    if (isLoading) {
        return (
            <Card elevation={1} sx={{ borderRadius: '14px', border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`, background: (theme) => `linear-gradient(150deg, ${alpha(theme.palette.background.paper, 0.92)}, ${alpha(theme.palette.primary.main, 0.06)})`, boxShadow: (theme) => `0 24px 60px -40px ${alpha(theme.palette.primary.main, 0.65)}` }}> {/* glassy frame */}
                <CardContent sx={{ p: { xs: 1.75, sm: 2.75 } }}> {/* T2 medium density */}
                    <Skeleton variant="text" width="40%" height={32} />
                    <Skeleton variant="rectangular" height={height} sx={{ mt: 2 }} />
                </CardContent>
            </Card>
        );
    }
    
    if (!data || data.length === 0) {
        return (
            <Card elevation={1} sx={{ borderRadius: '14px', border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`, background: (theme) => `linear-gradient(150deg, ${alpha(theme.palette.background.paper, 0.92)}, ${alpha(theme.palette.primary.main, 0.06)})`, boxShadow: (theme) => `0 24px 60px -40px ${alpha(theme.palette.primary.main, 0.65)}` }}> {/* glassy frame */}
                <CardContent sx={{ p: { xs: 1.75, sm: 2.75 } }}> {/* T2 medium density */}
                    <Typography variant="h6" gutterBottom>{title}</Typography>
                    <Box 
                        sx={{ 
                            height, 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            color: "text.secondary"
                        }}
                    >
                        <Typography variant="body2">No data available</Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card elevation={1} sx={{ borderRadius: '12px' }}> {/* C1 precise geometry */}
            <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}> {/* T2 medium density */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="h6">{title}</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {stats.trend === "up" ? (
                            <TrendingUpIcon color="success" fontSize="small" />
                        ) : (
                            <TrendingDownIcon color="error" fontSize="small" />
                        )}
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                fontWeight: 600,
                                color: stats.trend === "up" ? "success.main" : "error.main"
                            }}
                        >
                            {valuePrefix}{stats.latest.toFixed(2)}{valueSuffix}
                        </Typography>
                    </Box>
                </Box>
                
                <ResponsiveContainer width="100%" height={height}>
                    {showArea ? (
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorROI" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={fillFrom} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={fillTo} stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis 
                                dataKey="label" 
                                stroke={textColor}
                                tick={{ fill: textColor, fontSize: 12 }}
                            />
                            <YAxis 
                                stroke={textColor}
                                tick={{ fill: textColor, fontSize: 12 }}
                                tickFormatter={(value) => `${valuePrefix}${value}${valueSuffix}`}
                            />
                            <Tooltip 
                                contentStyle={{
                                    backgroundColor: alpha(theme.palette.background.paper, 0.96),
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                                    borderRadius: theme.shape.borderRadius,
                                }}
                                labelStyle={{ color: theme.palette.text.primary }}
                                formatter={(value: number) => [`${valuePrefix}${value.toFixed(2)}${valueSuffix}`, dataLabel]}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="roi" 
                                stroke={lineColor}
                                strokeWidth={2.5}
                                fill="url(#colorROI)"
                            />
                        </AreaChart>
                    ) : (
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis 
                                dataKey="label" 
                                stroke={textColor}
                                tick={{ fill: textColor, fontSize: 12 }}
                            />
                            <YAxis 
                                stroke={textColor}
                                tick={{ fill: textColor, fontSize: 12 }}
                                tickFormatter={(value) => `${valuePrefix}${value}${valueSuffix}`}
                            />
                            <Tooltip 
                                contentStyle={{
                                    backgroundColor: alpha(theme.palette.background.paper, 0.96),
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                                    borderRadius: theme.shape.borderRadius,
                                }}
                                labelStyle={{ color: theme.palette.text.primary }}
                                formatter={(value: number) => [`${valuePrefix}${value.toFixed(2)}${valueSuffix}`, dataLabel]}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="roi" 
                                stroke={lineColor}
                                strokeWidth={2.5}
                                dot={{ fill: lineColor, r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};
