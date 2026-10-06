import { describe, it, expect } from 'vitest'
import { validateAddress } from '@/services/crypto'

describe('Crypto Address Validation for Dynamic Blockchains', () => {
  it('validates Bitcoin SegWit and Legacy addresses correctly', () => {
    expect(validateAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', 'BITCOIN').valid).toBe(true)
    expect(validateAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', 'BITCOIN').valid).toBe(true)
    expect(validateAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', 'BITCOIN').valid).toBe(true)
    expect(validateAddress('0xinvalid', 'BITCOIN').valid).toBe(false)
  })

  it('validates EVM addresses across Ethereum, BSC, Polygon, and Arbitrum', () => {
    const validEvm = '0x1111cAFe2222babe3333dEAD4444beef5555cAFE'
    expect(validateAddress(validEvm, 'ETHEREUM_ERC20').valid).toBe(true)
    expect(validateAddress(validEvm, 'BSC_BEP20').valid).toBe(true)
    expect(validateAddress(validEvm, 'POLYGON').valid).toBe(true)
    expect(validateAddress(validEvm, 'ARBITRUM').valid).toBe(true)
    expect(validateAddress('0xshort', 'BSC_BEP20').valid).toBe(false)
  })

  it('validates TRON TRC20 addresses', () => {
    expect(validateAddress('TYDzsYUEpvnYmQk4zGP9sWWcTEd36d57yo', 'TRON_TRC20').valid).toBe(true)
    expect(validateAddress('0x1234567890123456789012345678901234567890', 'TRON_TRC20').valid).toBe(false)
  })

  it('validates Solana base58 addresses', () => {
    expect(validateAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', 'SOLANA').valid).toBe(true)
    expect(validateAddress('0xInvalidSolana', 'SOLANA').valid).toBe(false)
  })

  it('validates Ripple XRP addresses', () => {
    expect(validateAddress('rDsbeomaeKStUQaoWqYPP586NQ3eL22G5', 'RIPPLE').valid).toBe(true)
    expect(validateAddress('1InvalidRippleAddress', 'RIPPLE').valid).toBe(false)
  })

  it('validates Dogecoin and Litecoin addresses', () => {
    expect(validateAddress('D7Y5DzsYUEpvnYmQk4zGP9sWWcTEd36d57', 'DOGECOIN').valid).toBe(true)
    expect(validateAddress('LMCafe1111222233334444555566667788', 'LITECOIN').valid).toBe(true)
  })

  it('validates TON addresses', () => {
    expect(validateAddress('EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N', 'TON').valid).toBe(true)
    expect(validateAddress('short', 'TON').valid).toBe(false)
  })

  it('validates custom / generic chain addresses with minimum length', () => {
    expect(validateAddress('CustomChainAddress12345678', 'CUSTOM_NETWORK').valid).toBe(true)
    expect(validateAddress('short', 'CUSTOM_NETWORK').valid).toBe(false)
  })
})
