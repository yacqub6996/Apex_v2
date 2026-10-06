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


async def fetch_crypto_prices(
    custom_coins: Dict[str, str] | None = None,
    custom_fallback_rates: Dict[str, float] | None = None,
) -> Dict[str, float]:
    """
    Fetch live cryptocurrency prices from CoinGecko API.
    
    Returns a dictionary mapping coin symbols to USD prices.
    Falls back to static/configured rates if API key is not configured or request fails.
    """
    all_fallback_rates = {**FALLBACK_RATES}
    if custom_fallback_rates:
        all_fallback_rates.update(custom_fallback_rates)

    all_coingecko_ids = {**COINGECKO_IDS}
    if custom_coins:
        all_coingecko_ids.update(custom_coins)

    if not settings.COINGECKO_API_KEY:
        # No API key configured, return fallback rates
        return all_fallback_rates

    try:
        # Build list of unique coin IDs for API request
        unique_ids = list(set(filter(None, all_coingecko_ids.values())))
        if not unique_ids:
            return all_fallback_rates

        coin_ids = ",".join(unique_ids)

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
            for symbol, coin_id in all_coingecko_ids.items():
                if coin_id and coin_id in data and "usd" in data[coin_id]:
                    rates[symbol] = float(data[coin_id]["usd"])
                elif symbol in all_fallback_rates:
                    rates[symbol] = all_fallback_rates[symbol]
                else:
                    rates[symbol] = 1.0

            # Include any symbols that had fallback rates but no CoinGecko ID
            for symbol, rate in all_fallback_rates.items():
                if symbol not in rates:
                    rates[symbol] = rate

            return rates

    except Exception as e:
        # Log error but don't crash - return fallback rates
        print(f"Failed to fetch crypto prices from CoinGecko: {e}")
        return all_fallback_rates


def get_crypto_prices_sync(
    custom_fallback_rates: Dict[str, float] | None = None,
) -> Dict[str, float]:
    """
    Synchronous wrapper for fetch_crypto_prices.
    Returns fallback rates since we can't use async in sync context.
    
    Note: This should only be used where async is not possible.
    Prefer using fetch_crypto_prices() in async contexts.
    """
    rates = {**FALLBACK_RATES}
    if custom_fallback_rates:
        rates.update(custom_fallback_rates)
    return rates

