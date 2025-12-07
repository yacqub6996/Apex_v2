/**
 * Floating Support Chat Widget
 *
 * A globally accessible floating chat button that expands to a full ChatKit interface.
 * Features:
 * - Floating action button fixed to bottom-right of screen
 * - Expandable chat panel with ChatKit integration
 * - Unique session/thread per user with localStorage persistence
 * - Minimizable chat window
 * - Themed to match brand colors in light/dark mode
 */
import { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Fab,
  Paper,
  IconButton,
  Typography,
  Badge,
  Collapse,
  Fade,
  useTheme as useMuiTheme,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import RefreshIcon from '@mui/icons-material/Refresh';
import { ChatKit, useChatKit, type UseChatKitOptions } from '@openai/chatkit-react';

import { getAccessToken } from '@/api/client-config';
import { useAuth } from '@/providers/auth-provider';
import { useSupportWidgetStore } from '@/stores/support-widget-store';

export const FloatingSupportWidget = () => {
  const { user, isAuthenticated } = useAuth();
  const widgetStore = useSupportWidgetStore();
  const token = getAccessToken();
  const muiTheme = useMuiTheme();
  const [isMinimized, setIsMinimized] = useState(false);
  // Key to force ChatKit remount when starting new conversation
  const [chatKey, setChatKey] = useState(0);

  // Get current theme mode for ChatKit theming
  const themeMode = muiTheme.palette.mode;

  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
  const normalizedBase = apiBase.replace(/\/+$/, '');
  const endpoint = `${normalizedBase}/api/v1/customer-service/chatkit`;

  // Get thread ID for this user's session continuity
  // Only use authenticated user ID (widget is gated to authenticated users)
  const storedThreadId = user?.id ? widgetStore.getThreadId(user.id) : null;

  // Memoize the setThreadId callback to avoid useMemo dependency issues
  // widgetStore.setThreadId is stable since the store is memoized
  const handleThreadChange = useCallback(
    (event: { threadId: string | null }) => {
      if (user?.id && event.threadId) {
        widgetStore.setThreadId(user.id, event.threadId);
      }
    },
    [user?.id, widgetStore]
  );

  const options: UseChatKitOptions = useMemo(
    () => ({
      api: {
        url: endpoint,
        domainKey:
          typeof window !== 'undefined'
            ? window.location.hostname || 'local-dev'
            : 'local-dev',
        fetch: async (input, init) => {
          const initObj: RequestInit = init ?? {};
          const headers = new Headers(initObj.headers ?? {});
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          return fetch(input, { ...initObj, headers });
        },
      },
      // Theme ChatKit to match app's current theme mode
      theme: {
        colorScheme: themeMode,
      },
      // Use initialThread for session continuity - loads previous conversation
      initialThread: storedThreadId ?? null,
      header: {
        // Disable ChatKit's built-in header since we have custom branded header
        enabled: false,
      },
      composer: {
        attachments: {
          enabled: false,
        },
        placeholder: 'Ask a question...',
      },
      onError: (event) => {
        console.error('ChatKit error:', event?.error ?? event);
      },
      onReady: () => {
        console.info('ChatKit widget ready');
      },
      // Persist thread ID when it changes for session continuity
      onThreadChange: handleThreadChange,
    }),
    [endpoint, token, storedThreadId, handleThreadChange, themeMode]
  );

  const { control } = useChatKit(options);

  const handleOpen = () => {
    setIsMinimized(false);
    widgetStore.setOpen(true);
  };

  const handleClose = () => {
    setIsMinimized(false);
    widgetStore.setOpen(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleRestore = () => {
    setIsMinimized(false);
  };

  const handleNewConversation = () => {
    if (user?.id) {
      widgetStore.clearThreadId(user.id);
      // Increment key to force ChatKit remount with new thread
      setChatKey((prev) => prev + 1);
    }
  };

  // Don't render for unauthenticated users
  if (!isAuthenticated || !token) {
    return null;
  }

  // Use store's isOpen directly as source of truth
  const isOpen = widgetStore.isOpen;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: { xs: 16, md: 24 },
        right: { xs: 16, md: 24 },
        zIndex: (theme) => theme.zIndex.snackbar,
      }}
    >
      {/* Floating Chat Button - Uses brand primary color */}
      <Fade in={!isOpen} unmountOnExit>
        <Fab
          color="primary"
          onClick={handleOpen}
          sx={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            boxShadow: 4,
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark',
              transform: 'scale(1.05)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
          aria-label="Open support chat"
        >
          <Badge
            color="error"
            variant="dot"
            invisible={!storedThreadId}
            sx={{
              '& .MuiBadge-badge': {
                top: 8,
                right: 8,
              },
            }}
          >
            <ChatIcon />
          </Badge>
        </Fab>
      </Fade>

      {/* Chat Panel */}
      <Collapse in={isOpen} timeout={300}>
        <Paper
          elevation={8}
          sx={{
            // On mobile, let the widget breathe near the bottom-right corner
            // instead of occupying most of the viewport height.
            width: { xs: 'min(100vw - 32px, 380px)', sm: 380 },
            height: isMinimized ? 56 : { xs: 360, sm: 520 },
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            overflow: 'hidden',
            transition: 'height 0.3s ease-in-out',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Header - Branded with primary color */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              cursor: isMinimized ? 'pointer' : 'default',
              minHeight: 56,
            }}
            onClick={isMinimized ? handleRestore : undefined}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ChatIcon fontSize="small" />
              <Typography variant="subtitle2" fontWeight={600}>
                Apex Support
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNewConversation();
                }}
                sx={{ 
                  color: 'inherit',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.15)',
                  },
                }}
                title="Start new conversation"
                aria-label="Start new conversation"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  isMinimized ? handleRestore() : handleMinimize();
                }}
                sx={{ 
                  color: 'inherit',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.15)',
                  },
                }}
                aria-label={isMinimized ? "Restore chat window" : "Minimize chat window"}
              >
                <MinimizeIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                sx={{ 
                  color: 'inherit',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.15)',
                  },
                }}
                aria-label="Close support chat"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Chat Content */}
          {!isMinimized && (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                bgcolor: 'background.paper',
              }}
            >
              <ChatKit
                key={chatKey}
                control={control}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 0,
                  overflow: 'hidden',
                }}
              />
            </Box>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
};
