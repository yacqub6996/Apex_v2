import { Box, Typography, useTheme as useMuiTheme } from '@mui/material';
import { ChatKit, useChatKit, type UseChatKitOptions } from '@openai/chatkit-react';
import { useCallback, useMemo } from 'react';

import { getAccessToken } from '@/api/client-config';
import { useAuth } from '@/providers/auth-provider';
import { useSupportWidgetStore } from '@/stores/support-widget-store';

export const SupportChat = () => {
  const { user, isAuthenticated } = useAuth();
  const widgetStore = useSupportWidgetStore();
  const token = getAccessToken();
  const muiTheme = useMuiTheme();

  // Get current theme mode for ChatKit theming
  const themeMode = muiTheme.palette.mode;

  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
  const normalizedBase = apiBase.replace(/\/+$/, '');
  const endpoint = `${normalizedBase}/api/v1/customer-service/chatkit`;

  // Re-use the same per-user thread ID as the floating widget
  const storedThreadId = user?.id ? widgetStore.getThreadId(user.id) : null;

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
        domainKey: typeof window !== 'undefined' ? window.location.hostname || 'local-dev' : 'local-dev',
        fetch: async (input, init) => {
          const initObj: RequestInit = init ?? {};
          const headers = new Headers(initObj.headers ?? {});
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          return fetch(input, { ...initObj, headers });
        },
      },
      // Reuse the same thread across the support page and floating widget
      initialThread: storedThreadId ?? null,
      // Theme ChatKit to match app's current theme mode
      theme: {
        colorScheme: themeMode,
      },
      header: {
        title: {
          enabled: true,
          text: 'Apex Support Assistant',
        },
      },
      composer: {
        // Explicitly disable attachments for v1
        attachments: {
          enabled: false,
        },
      },
      onThreadChange: handleThreadChange,
      onError: (event) => {
        // Surface ChatKit errors in the console for easier debugging
        // eslint-disable-next-line no-console
        console.error('ChatKit error:', event?.error ?? event);
      },
      onReady: () => {
        // eslint-disable-next-line no-console
        console.info('ChatKit ready');
      },
    }),
    [endpoint, token, themeMode, storedThreadId, handleThreadChange]
  );

  const { control } = useChatKit(options);

  if (!isAuthenticated || !token) {
    return (
      <Box
        sx={{
          p: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Log in to chat with the Apex support assistant.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        // Responsive height: give the chat more room on mobile
        height: { xs: 'min(80vh, 520px)', sm: 420, md: 480 },
        minHeight: 320,
      }}
    >
      <ChatKit
        control={control}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 0,
        }}
      />
    </Box>
  );
};
