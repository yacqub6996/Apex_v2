/**
 * CoinGecko API Service
 * 
 * Fetches real-time cryptocurrency and forex prices from CoinGecko API
 * Documentation: https://www.coingecko.com/api/documentation
 */

const COINGECKO_API_KEY = import.meta.env.VITE_COINGECKO_API_KEY || "CG-b1ANv9Zod5gXaj69RRhScwY8";
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

export interface CoinGeckoPrice {
    id: string;
    symbol: string;
    name: string;
    current_price: number;
    price_change_24h: number;
    price_change_percentage_24h: number;
}

export interface MarketPriceData {
    symbol: string;
    displayName: string;
    price: number;
    change: number;
    changePercent: number;
}

/**
 * Fetch cryptocurrency prices from CoinGecko
 * 
 * @param coinIds - Array of CoinGecko coin IDs (e.g., ['bitcoin', 'ethereum'])
 * @returns Promise with array of price data
 */
export async function fetchCryptoPrices(
    coinIds: string[] = ['bitcoin', 'ethereum', 'tether', 'binancecoin', 'solana']
): Promise<MarketPriceData[]> {
    try {
        const ids = coinIds.join(',');
        const url = `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`;
        
        const response = await fetch(url, {
            headers: {
                'x-cg-demo-api-key': COINGECKO_API_KEY,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }

        const data: CoinGeckoPrice[] = await response.json();

        return data.map((coin) => ({
            symbol: coin.symbol.toUpperCase(),
            displayName: getDisplayName(coin.symbol.toUpperCase()),
            price: coin.current_price,
            change: coin.price_change_24h,
            changePercent: coin.price_change_percentage_24h,
        }));
    } catch (error) {
        console.error('Error fetching crypto prices from CoinGecko:', error);
        throw error;
    }
}

/**
 * Fetch simple price for specific coins
 * Lighter endpoint for quick price checks
 * 
 * @param coinIds - Array of coin IDs
 * @returns Promise with price data
 */
export async function fetchSimplePrices(
    coinIds: string[] = ['bitcoin', 'ethereum']
): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
    try {
        const ids = coinIds.join(',');
        const url = `${COINGECKO_BASE_URL}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
        
        const response = await fetch(url, {
            headers: {
                'x-cg-demo-api-key': COINGECKO_API_KEY,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching simple prices from CoinGecko:', error);
        throw error;
    }
}

/**
 * Get display names for tickers
 */
function getDisplayName(symbol: string): string {
    const displayNames: Record<string, string> = {
        'BTC': 'Bitcoin',
        'ETH': 'Ethereum',
        'USDT': 'Tether',
        'BNB': 'Binance',
        'SOL': 'Solana',
        'XRP': 'Ripple',
        'ADA': 'Cardano',
        'DOGE': 'Dogecoin',
        'MATIC': 'Polygon',
        'DOT': 'Polkadot',
    };
    
    return displayNames[symbol] || symbol;
}

/**
 * Get popular crypto coin IDs for market ticker
 */
export function getDefaultCoinIds(): string[] {
    return [
        'bitcoin',       // BTC
        'ethereum',      // ETH
        'binancecoin',   // BNB
        'solana',        // SOL
        'ripple',        // XRP
    ];
}

/**
 * Trending coin response interface
 */
interface TrendingCoinItem {
    item: {
        id: string;
        name: string;
        symbol: string;
        market_cap_rank: number;
        thumb: string;
        small: string;
        large: string;
        slug: string;
        price_btc: number;
        score: number;
    };
}

interface TrendingCoinsResponse {
    coins: TrendingCoinItem[];
}

/**
 * Fetch trending coins
 */
export async function fetchTrendingCoins(): Promise<MarketPriceData[]> {
    try {
        const url = `${COINGECKO_BASE_URL}/search/trending`;
        
        const response = await fetch(url, {
            headers: {
                'x-cg-demo-api-key': COINGECKO_API_KEY,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }

        const data: TrendingCoinsResponse = await response.json();
        const trendingIds = data.coins.slice(0, 5).map((coin) => coin.item.id);
        
        // Fetch detailed prices for trending coins
        return await fetchCryptoPrices(trendingIds);
    } catch (error) {
        console.error('Error fetching trending coins:', error);
        throw error;
    }
}
