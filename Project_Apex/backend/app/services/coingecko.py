"""CoinGecko API service for fetching live cryptocurrency prices"""
import httpx
from typing import Dict

from app.core.config import settings


# CoinGecko API coin IDs mapping
COINGECKO_IDS = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "USDT": "tether",
    "USDC": "usd-coin",
}

# Fallback rates if API is unavailable
FALLBACK_RATES = {
    "BTC": 60000.0,
    "ETH": 3000.0,
    "USDT": 1.0,
    "USDC": 1.0,
}


async def fetch_crypto_prices() -> Dict[str, float]:
    """
    Fetch live cryptocurrency prices from CoinGecko API.
    
    Returns a dictionary mapping coin symbols to USD prices.
    Falls back to static rates if API key is not configured or request fails.
    """
    if not settings.COINGECKO_API_KEY:
        # No API key configured, return fallback rates
        return FALLBACK_RATES
    
    try:
        # Build list of coin IDs for API request
        coin_ids = ",".join(COINGECKO_IDS.values())
        
        # CoinGecko Pro API endpoint
        url = "https://pro-api.coingecko.com/api/v3/simple/price"
        params = {
            "ids": coin_ids,
            "vs_currencies": "usd",
            "x_cg_pro_api_key": settings.COINGECKO_API_KEY,
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            # Map CoinGecko IDs back to our coin symbols
            rates = {}
            for symbol, coin_id in COINGECKO_IDS.items():
                if coin_id in data and "usd" in data[coin_id]:
                    rates[symbol] = float(data[coin_id]["usd"])
                else:
                    # Fallback for individual coin if not in response
                    rates[symbol] = FALLBACK_RATES[symbol]
            
            return rates
            
    except Exception as e:
        # Log error but don't crash - return fallback rates
        # In production, you'd want to log this properly
        print(f"Failed to fetch crypto prices from CoinGecko: {e}")
        return FALLBACK_RATES


def get_crypto_prices_sync() -> Dict[str, float]:
    """
    Synchronous wrapper for fetch_crypto_prices.
    Returns fallback rates since we can't use async in sync context.
    
    Note: This should only be used where async is not possible.
    Prefer using fetch_crypto_prices() in async contexts.
    """
    # For now, return fallback rates in sync context
    # Could use asyncio.run() but that's not always safe
    return FALLBACK_RATES
