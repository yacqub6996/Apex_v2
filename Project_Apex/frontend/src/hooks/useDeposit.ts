/**
 * useDeposit - Hook for managing crypto deposit flow with timer
 * Handles deposit address generation, timer countdown, and payment confirmation
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { TimerState, DepositSession } from '@/types/crypto'
import { useGenerateAddress, useConfirmPayment, useCryptoRates } from '@/services/crypto'
import cryptoTokens from '@/theme/tokens/crypto.json'

interface UseDepositTimerOptions {
  expiresAt: string | null
  onExpire?: () => void
}

/**
 * Timer hook for deposit countdown
 * Calculates time remaining and determines timer state
 */
export function useDepositTimer({ expiresAt, onExpire }: UseDepositTimerOptions) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [timerState, setTimerState] = useState<TimerState>('expired')
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const calculateTimeRemaining = useCallback(() => {
    if (!expiresAt) return 0
    
    const now = new Date().getTime()
    const expiry = new Date(expiresAt).getTime()
    const remaining = Math.max(0, Math.floor((expiry - now) / 1000))
    
    return remaining
  }, [expiresAt])

  useEffect(() => {
    if (!expiresAt) {
      setTimerState('expired')
      setTimeRemaining(0)
      return
    }

    // Update immediately
    const remaining = calculateTimeRemaining()
    setTimeRemaining(remaining)

    // Determine state based on remaining time
    if (remaining <= 0) {
      setTimerState('expired')
      onExpire?.()
    } else if (remaining <= cryptoTokens.timer.critical.threshold) {
      setTimerState('critical')
    } else if (remaining <= cryptoTokens.timer.warning.threshold) {
      setTimerState('warning')
    } else {
      setTimerState('active')
    }

    // Set up interval to update every second
    intervalRef.current = setInterval(() => {
      const newRemaining = calculateTimeRemaining()
      setTimeRemaining(newRemaining)

      // Update state based on remaining time
      if (newRemaining <= 0) {
        setTimerState('expired')
        onExpire?.()
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      } else if (newRemaining <= cryptoTokens.timer.critical.threshold) {
        setTimerState('critical')
      } else if (newRemaining <= cryptoTokens.timer.warning.threshold) {
        setTimerState('warning')
      } else {
        setTimerState('active')
      }
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [expiresAt, calculateTimeRemaining, onExpire])

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  return {
    timeRemaining,
    timerState,
    formattedTime: formatTime(timeRemaining),
    isExpired: timerState === 'expired',
    isCritical: timerState === 'critical',
    isWarning: timerState === 'warning',
  }
}

/**
 * Copy to clipboard with animation feedback
 */
export function useCopyWithToast() {
  const [copied, setCopied] = useState(false)
  const [animating, setAnimating] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text)
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set copied and animating state
      setCopied(true)
      setAnimating(true)

      // Reset after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setCopied(false)
        setAnimating(false)
      }, 2000)

      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    copied,
    animating,
    copyToClipboard,
  }
}

interface UseDepositFlowOptions {
  onSuccess?: (session: DepositSession) => void
  onError?: (error: Error) => void
  onConfirmSuccess?: () => void
}

/**
 * Main deposit flow hook
 * Manages the entire deposit process from address generation to confirmation
 */
export function useDepositFlow(options: UseDepositFlowOptions = {}) {
  const [depositSession, setDepositSession] = useState<DepositSession | null>(null)
  const [step, setStep] = useState<'input' | 'address' | 'pending'>('input')

  const generateMutation = useGenerateAddress()
  const confirmMutation = useConfirmPayment()
  const { data: rates } = useCryptoRates()

  const handleGenerateAddress = useCallback(
    async (coin: string, network: string, usdAmount: number) => {
      try {
        const response = await generateMutation.mutateAsync({
          coin,
          network,
          usd_amount: usdAmount,
        })

        // Calculate time remaining from expires_at
        const expiresAt = new Date(response.expires_at).getTime()
        const now = Date.now()
        const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000))

        // Get current rate and calculate crypto amount
        const vatAmount = 5.0
        const totalAmount = usdAmount + vatAmount
        const rate = rates?.[coin as keyof typeof rates] || 1
        const cryptoAmount = (totalAmount / rate).toFixed(8).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')

        // Transform response to DepositSession
        const session: DepositSession = {
          id: response.transaction_id,
          asset: coin as any,
          network: network as any,
          amountUsd: usdAmount,
          vatFeeUsd: vatAmount,
          cryptoAmount,
          usdRate: rate,
          walletAddress: response.address,
          expiresAt: response.expires_at,
          timeRemaining,
          expired: false,
          memo: response.memo || undefined,
        }

        setDepositSession(session)
        setStep('address')
        options.onSuccess?.(session)
      } catch (error) {
        options.onError?.(error as Error)
      }
    },
    [generateMutation, options, rates]
  )

  const handleConfirmPayment = useCallback(
    async (transactionId: string) => {
      try {
        await confirmMutation.mutateAsync({
          transaction_id: transactionId,
        })

        setStep('pending')
        options.onConfirmSuccess?.()
      } catch (error) {
        options.onError?.(error as Error)
      }
    },
    [confirmMutation, options]
  )

  const handleReset = useCallback(() => {
    setDepositSession(null)
    setStep('input')
  }, [])

  const handleExpire = useCallback(() => {
    if (depositSession) {
      setDepositSession({
        ...depositSession,
        expired: true,
        timeRemaining: 0,
      })
    }
  }, [depositSession])

  return {
    depositSession,
    step,
    setStep,
    handleGenerateAddress,
    handleConfirmPayment,
    handleReset,
    handleExpire,
    isGenerating: generateMutation.isPending,
    isConfirming: confirmMutation.isPending,
    generateError: generateMutation.error,
    confirmError: confirmMutation.error,
  }
}
