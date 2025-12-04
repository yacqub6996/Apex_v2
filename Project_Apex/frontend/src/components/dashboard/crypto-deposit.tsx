import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { QRCode } from '@/components/shared-assets/qr-code';

export type CoinKey = 'BTC' | 'ETH' | 'USDT_TRC20' | 'USDC_POLYGON';

const COIN_META: Record<CoinKey, { label: string; network: string }> = {
  BTC: { label: 'BTC (Bitcoin)', network: 'Bitcoin' },
  ETH: { label: 'ETH (Ethereum)', network: 'Ethereum' },
  USDT_TRC20: { label: 'USDT (TRC20)', network: 'TRON - TRC20' },
  USDC_POLYGON: { label: 'USDC (Polygon)', network: 'Polygon - ERC20' },
};

// Static demo addresses (format-valid but not real accounts)
const COIN_ADDRESSES: Record<CoinKey, string> = {
  BTC: 'bc1q9demo0x9k4u5y6x7z8q2m3n4p5r6s7t8v9w0xy',
  ETH: '0x7E57D3m0cAfE0000000000000000000000CaFe00',
  USDT_TRC20: 'TQ2DeM0Addr3ss111111111111111111111111',
  USDC_POLYGON: '0x1111cAFe2222babe3333dEAD4444beef5555cAFE',
};

// Simulated USD prices (coarse)
const USD_RATES: Record<CoinKey, number> = {
  BTC: 60000,
  ETH: 3000,
  USDT_TRC20: 1,
  USDC_POLYGON: 1,
};

interface CryptoDepositProps {
  initialCoin?: CoinKey;
  enableConfirm?: boolean;
  onConfirm?: (payload: { usdAmount: number; coin: CoinKey; address: string }) => void;
}

export const CryptoDeposit: React.FC<CryptoDepositProps> = ({ initialCoin = 'USDT_TRC20', enableConfirm = false, onConfirm }) => {
  const [coin, setCoin] = useState<CoinKey>(initialCoin);
  const [isLoading, setIsLoading] = useState(false);
  const [usd, setUsd] = useState<string>('100');

  // Simulate network fetch when coin changes
  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(t);
  }, [coin]);

  const address = useMemo(() => COIN_ADDRESSES[coin], [coin]);
  const network = COIN_META[coin].network;
  const rate = USD_RATES[coin];
  const coinAmount = useMemo(() => {
    const v = parseFloat(usd);
    if (!Number.isFinite(v) || v <= 0) return '';
    return (v / rate).toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
  }, [rate, usd]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      // noop
    }
  };

  const symbol = COIN_META[coin].label.split(' ')[0];

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardHeader title="Crypto Deposit" subheader="Select a coin to view your deposit address" />
      <CardContent>
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="coin-select">Coin</InputLabel>
                <Select labelId="coin-select" value={coin} label="Coin" onChange={(e) => setCoin(e.target.value as CoinKey)}>
                  {(['BTC','ETH','USDT_TRC20','USDC_POLYGON'] as CoinKey[]).map((k) => (
                    <MenuItem key={k} value={k}>{COIN_META[k].label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">Network</Typography>
                <Typography variant="body2" fontWeight={600}>{network}</Typography>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">Deposit address</Typography>
                <TextField
                  value={isLoading ? '' : address}
                  placeholder={isLoading ? 'Fetching address...' : ''}
                  size="small"
                  fullWidth
                  InputProps={{
                    readOnly: true,
                    sx: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Copy address">
                          <span>
                            <IconButton onClick={handleCopy} disabled={isLoading} size="small" aria-label="Copy address">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">Amount (USD)</Typography>
                <TextField
                  size="small"
                  value={usd}
                  onChange={(e) => setUsd(e.target.value)}
                  placeholder="Amount in USD"
                  type="number"
                  fullWidth
                  inputProps={{ inputMode: 'decimal', step: '0.01', min: '0' }}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {coinAmount || '--'} {symbol} ~ ${rate.toLocaleString()} / {symbol}
                </Typography>
                {enableConfirm && (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={isLoading || !usd || !Number.isFinite(parseFloat(usd)) || parseFloat(usd) <= 0}
                      onClick={() => {
                        const v = parseFloat(usd);
                        if (!onConfirm || !Number.isFinite(v) || v <= 0) return;
                        onConfirm({ usdAmount: v, coin, address });
                      }}
                    >
                      Create Deposit Request
                    </Button>
                  </Box>
                )}
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                {isLoading ? (
                  <Stack alignItems="center" spacing={1}>
                    <CircularProgress size={24} />
                    <Typography variant="caption" color="text.secondary">Fetching address...</Typography>
                  </Stack>
                ) : (
                  <Stack alignItems="center" spacing={1}>
                    <QRCode size="lg" value={address} />
                    <Typography variant="caption" color="text.secondary">Scan to copy address</Typography>
                  </Stack>
                )}
              </Box>
            </Grid>
          </Grid>

          <Typography variant="caption" color="text.secondary">
            Send only the selected coin to this address. Deposits require confirmations on-chain before crediting.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

