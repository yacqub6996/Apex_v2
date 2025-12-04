import { useState } from 'react';
import {
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import ViewCompactIcon from '@mui/icons-material/ViewCompact';
import LanguageIcon from '@mui/icons-material/Language';
import { useDashboardStore, type PreferredCurrency } from '@/stores/dashboard-store';

/**
 * PreferencesMenu - A menu component for user preferences in the AppBar
 * 
 * Provides options to customize:
 * - Preferred currency (USD, EUR, NGN, BTC)
 * - Compact layout toggle
 * - (Reserved) Language selection
 */
export const PreferencesMenu = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  const preferredCurrency = useDashboardStore((s) => s.preferredCurrency);
  const setPreferredCurrency = useDashboardStore((s) => s.setPreferredCurrency);
  const useCompactLayout = useDashboardStore((s) => s.useCompactLayout);
  const toggleCompactLayout = useDashboardStore((s) => s.toggleCompactLayout);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCurrencyChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setPreferredCurrency(event.target.value as PreferredCurrency);
  };

  const handleCompactToggle = () => {
    toggleCompactLayout();
  };

  return (
    <>
      <IconButton
        aria-label="preferences"
        aria-controls={open ? 'preferences-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        sx={{
          color: 'text.secondary',
          '&:hover': {
            color: 'text.primary',
          },
        }}
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        id="preferences-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'preferences-button',
        }}
        PaperProps={{
          elevation: 3,
          sx: {
            minWidth: 280,
            mt: 1.5,
          },
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Preferences
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Customize your dashboard experience
          </Typography>
        </Box>
        <Divider />

        {/* Currency Preference */}
        <MenuItem
          sx={{
            py: 1.5,
            '&:hover': { backgroundColor: 'transparent' },
          }}
          disableRipple
        >
          <Stack spacing={1} sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CurrencyExchangeIcon fontSize="small" color="action" />
              <Typography variant="body2" fontWeight={500}>
                Preferred Currency
              </Typography>
            </Box>
            <Select
              value={preferredCurrency}
              onChange={handleCurrencyChange as any}
              size="small"
              fullWidth
              sx={{
                '& .MuiSelect-select': {
                  py: 1,
                },
              }}
            >
              <MenuItem value="USD">USD ($)</MenuItem>
              <MenuItem value="EUR">EUR (€)</MenuItem>
              <MenuItem value="NGN">NGN (₦)</MenuItem>
              <MenuItem value="BTC">BTC (₿)</MenuItem>
            </Select>
          </Stack>
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        {/* Compact Layout Toggle */}
        <MenuItem
          onClick={handleCompactToggle}
          sx={{ py: 1.5 }}
        >
          <ListItemIcon>
            <ViewCompactIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">Compact Layout</Typography>
            <Typography variant="caption" color="text.secondary">
              Reduce spacing in cards
            </Typography>
          </ListItemText>
          <Switch
            edge="end"
            checked={useCompactLayout}
            onClick={(e) => e.stopPropagation()}
            onChange={handleCompactToggle}
          />
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        {/* Language (Reserved - Not Implemented) */}
        <MenuItem
          disabled
          sx={{ py: 1.5 }}
        >
          <ListItemIcon>
            <LanguageIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">Language</Typography>
            <Typography variant="caption" color="text.secondary">
              Coming soon
            </Typography>
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};
