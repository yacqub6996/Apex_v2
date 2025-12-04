import { createContext, useContext, useEffect, useMemo, useState, type ReactNode, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoginService } from '@/api/services/LoginService';
import { UsersService } from '@/api/services/UsersService';
import type { KycStatus } from '@/api/models/KycStatus';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  syncAccessTokenFromStorage,
} from '@/api/client-config';

export type UserRole = 'admin' | 'user';

type AccountTier = string;

type User = {
  id: string;
  email: string;
  full_name?: string | null;
  profile_picture_url?: string | null;
  is_active?: boolean;
  email_verified?: boolean;
  email_verified_at?: string | null;
  role: UserRole;
  account_tier: AccountTier;
  kyc_status: KycStatus;
  kyc_submitted_at?: string | null;
  kyc_approved_at?: string | null;
  kyc_verified_at?: string | null;
  kyc_rejected_reason?: string | null;
  kyc_notes?: string | null;
  balance?: number;
  availableBalance?: number;
  allocatedCopyBalance?: number;
  longTermBalance?: number;
  totalBalance?: number;
  // New wallet-backed balances (snake_case to mirror API for validation logging)
  copy_trading_wallet_balance?: number;
  long_term_wallet_balance?: number;
  pendingLongTermWalletWithdrawal?: number;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<UserRole>;
  loginWithGoogle: (idToken: string) => Promise<UserRole>;
  logout: () => void;
  refreshToken: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Move normaliseUser outside the component to fix Fast Refresh compatibility
const normaliseUser = (payload: Record<string, unknown>): User => {
  const rawRole = ((payload.role as string) ?? 'user').toLowerCase();
  const role: UserRole = rawRole === 'admin' ? 'admin' : 'user';
  
  // Use new balance fields: wallet_balance and copy_trading_balance
  const walletBalance = typeof payload.wallet_balance === 'number'
    ? (payload.wallet_balance as number)
    : Number(payload.wallet_balance ?? payload.balance ?? 0);
  
  const copyTradingBalance = typeof payload.copy_trading_balance === 'number'
    ? (payload.copy_trading_balance as number)
    : Number(payload.copy_trading_balance ?? 0);
  
  const longTermBalance = typeof payload.long_term_balance === 'number'
    ? (payload.long_term_balance as number)
    : Number(payload.long_term_balance ?? 0);

  // New wallet-backed balances
  const copyTradingWalletBalance = typeof payload.copy_trading_wallet_balance === 'number'
    ? (payload.copy_trading_wallet_balance as number)
    : Number(payload.copy_trading_wallet_balance ?? 0);
  const longTermWalletBalance = typeof payload.long_term_wallet_balance === 'number'
    ? (payload.long_term_wallet_balance as number)
    : Number(payload.long_term_wallet_balance ?? 0);
  const pendingLongTermWalletWithdrawal = typeof payload.pending_long_term_wallet_withdrawal === 'number'
    ? (payload.pending_long_term_wallet_withdrawal as number)
    : Number(payload.pending_long_term_wallet_withdrawal ?? 0);

  const totalBalance = walletBalance + copyTradingBalance + longTermBalance;

  return {
    id: String(payload.id),
    email: String(payload.email),
    full_name: (payload.full_name as string | null) ?? null,
    profile_picture_url: (payload as any).profile_picture_url as string | null,
    is_active: Boolean(payload.is_active ?? true),
    email_verified: Boolean((payload as any).email_verified ?? false),
    email_verified_at: ((payload as any).email_verified_at as string | null) ?? null,
    role,
    account_tier: String(payload.account_tier ?? 'basic'),
    kyc_status: (payload.kyc_status as KycStatus) ?? 'PENDING',
    kyc_submitted_at: (payload.kyc_submitted_at as string | null) ?? null,
    kyc_approved_at: (payload.kyc_approved_at as string | null) ?? null,
    kyc_verified_at: (payload.kyc_verified_at as string | null) ?? null,
    kyc_rejected_reason: (payload.kyc_rejected_reason as string | null) ?? null,
    kyc_notes: (payload.kyc_notes as string | null) ?? null,
    balance: walletBalance, // Legacy field - map to wallet_balance
    availableBalance: walletBalance, // Map to wallet_balance
    allocatedCopyBalance: copyTradingBalance, // Map to copy_trading_balance
    longTermBalance: longTermBalance,
    totalBalance: totalBalance, // Calculate as sum of wallet + copy trading + long term
    // Include wallet-backed balances directly for temporary validation
    copy_trading_wallet_balance: copyTradingWalletBalance,
    long_term_wallet_balance: longTermWalletBalance,
    pendingLongTermWalletWithdrawal: pendingLongTermWalletWithdrawal,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthTokenState] = useState<string | undefined>(() => getAccessToken());
  const queryClient = useQueryClient();

  useEffect(() => {
    setAuthTokenState(syncAccessTokenFromStorage());
  }, []);

  const userQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => UsersService.usersReadUserMe(),
    enabled: Boolean(authToken),
    retry: (failureCount, error: Error) => {
      if (error.message.includes('401')) {
        return false;
      }
      return failureCount < 3;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Handle user query timeout and errors
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (userQuery.isFetching && !userQuery.data && !userQuery.error) {
      // Set a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        console.warn('User query timeout - clearing invalid token');
        clearAccessToken();
        setAuthTokenState(undefined);
        queryClient.removeQueries({ queryKey: ['currentUser'] });
      }, 10000); // 10 second timeout
    }

    if (userQuery.error) {
      console.error('Failed to fetch current user:', userQuery.error);
      // Clear invalid token on error
      if (userQuery.error instanceof Error && 
          (userQuery.error.message.includes('401') || userQuery.error.message.includes('403'))) {
        clearAccessToken();
        setAuthTokenState(undefined);
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [userQuery.isFetching, userQuery.data, userQuery.error, queryClient]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      console.log('Login mutation: Attempting login for', email);
      const result = await LoginService.loginLoginAccessToken({
        username: email,
        password,
        grant_type: 'password',
      });
      console.log('Login mutation: Request completed successfully', result);
      return result;
    },
    onSuccess: async (data) => {
      console.log('Login mutation: Success, setting token', data);
      setAccessToken(data.access_token);
      setAuthTokenState(data.access_token);
      try {
        console.log('Login mutation: Fetching current user');
        const currentUser = await UsersService.usersReadUserMe();
        console.log('Login mutation: User fetched successfully', currentUser);
        queryClient.setQueryData(['currentUser'], currentUser);
        setUser(normaliseUser(currentUser as Record<string, unknown>));
      } catch (error) {
        console.error('Login mutation: Failed to fetch user after login', error);
        clearAccessToken();
        setAuthTokenState(undefined);
        queryClient.removeQueries({ queryKey: ['currentUser'] });
        throw error;
      }
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: async ({ idToken }: { idToken: string }) => {
      console.log('Google login mutation: Attempting Google login');
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/v1/login/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      
      if (!response.ok) {
        let msg = `Google login failed (${response.status})`;
        try {
          const body = await response.json();
          if (body?.detail) msg = String(body.detail);
        } catch {}
        throw new Error(msg);
      }
      
      const data = await response.json();
      console.log('Google login mutation: Request completed successfully', data);
      return data;
    },
    onSuccess: async (data) => {
      console.log('Google login mutation: Success, setting token', data);
      setAccessToken(data.access_token);
      setAuthTokenState(data.access_token);
      try {
        console.log('Google login mutation: Fetching current user');
        const currentUser = await UsersService.usersReadUserMe();
        console.log('Google login mutation: User fetched successfully', currentUser);
        queryClient.setQueryData(['currentUser'], currentUser);
        setUser(normaliseUser(currentUser as Record<string, unknown>));
      } catch (error) {
        console.error('Google login mutation: Failed to fetch user after login', error);
        clearAccessToken();
        setAuthTokenState(undefined);
        queryClient.removeQueries({ queryKey: ['currentUser'] });
        throw error;
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      clearAccessToken();
      setAuthTokenState(undefined);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['currentUser'] });
      setUser(null);
      // Navigation will be handled by RouteGuard when authentication state changes
      console.log('Logout successful - user state cleared');
    },
  });

  useEffect(() => {
    console.log('Auth state change detected:', {
      hasData: !!userQuery.data,
      isLoading: userQuery.isLoading,
      isFetching: userQuery.isFetching,
      error: userQuery.error,
      profilePictureUrl: (userQuery.data as any)?.profile_picture_url,
    });

    if (userQuery.data) {
      const payload = userQuery.data as Record<string, unknown>;
      const normalized = normaliseUser(payload);
      console.log('Setting new user state. New URL:', normalized.profile_picture_url);
      setUser(normalized);
    } else if (!userQuery.isFetching) {
      console.log('No user data and not fetching, setting user to null.');
      setUser(null);
    }
    setIsLoading(userQuery.isLoading);
  }, [userQuery.data, userQuery.isLoading, userQuery.isFetching, userQuery.error, authToken]);

  const login = useCallback(async (email: string, password: string): Promise<UserRole> => {
    try {
      const token = await loginMutation.mutateAsync({ email, password });
      const rawRole = ((token?.role as string) ?? 'user').toLowerCase();
      return rawRole === 'admin' ? 'admin' : 'user';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      throw new Error(message);
    }
  }, [loginMutation]);

  const loginWithGoogle = useCallback(async (idToken: string): Promise<UserRole> => {
    try {
      const token = await googleLoginMutation.mutateAsync({ idToken });
      const rawRole = ((token?.role as string) ?? 'user').toLowerCase();
      return rawRole === 'admin' ? 'admin' : 'user';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google login failed';
      throw new Error(message);
    }
  }, [googleLoginMutation]);

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  useEffect(() => {
    const handleAuthError = () => {
      logout();
    };

    window.addEventListener('auth-error', handleAuthError);

    return () => {
      window.removeEventListener('auth-error', handleAuthError);
    };
  }, [logout]);

  const refreshToken = async () => {
    logout();
  };

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading: isLoading || loginMutation.isPending || googleLoginMutation.isPending,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      login,
      loginWithGoogle,
      logout,
      refreshToken,
    }),
    [
      user,
      isLoading,
      loginMutation.isPending,
      googleLoginMutation.isPending,
      // login, // These functions are stable and don't need to be in the deps array
      // loginWithGoogle,
      // logout,
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
