import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "@/router";
import { ThemeProvider } from "@/providers/theme-provider";
import { MaterialThemeProvider } from "@/providers/material-theme-provider";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { EnhancedToastProvider } from "@/providers/enhanced-toast-provider";
import { AuthErrorBoundary } from "@/components/auth/error-boundary";
import { FloatingSupportWidget } from "@/components/support-widget";
import "@/api/client-config";
import "@/styles/globals.css";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 10, // 10 seconds
            retry: 1,
            refetchOnWindowFocus: true,
        },
    },
});

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

// Wrapper component to conditionally show support widget (hide for admins)
const ConditionalSupportWidget = () => {
    const { user } = useAuth();
    // Don't show support widget for admin users
    if (user?.role === 'admin') {
        return null;
    }
    return <FloatingSupportWidget />;
};

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <AuthErrorBoundary>
                <AuthProvider>
                    <ThemeProvider defaultTheme="dark">
                        <MaterialThemeProvider>
                            <EnhancedToastProvider>
                                {googleClientId ? (
                                    <GoogleOAuthProvider clientId={googleClientId}>
                                        <RouterProvider router={router} />
                                        <ConditionalSupportWidget />
                                    </GoogleOAuthProvider>
                                ) : (
                                    <>
                                        {console.warn(
                                            "VITE_GOOGLE_CLIENT_ID is not set; Google Login will be disabled.",
                                        )}
                                        <RouterProvider router={router} />
                                        <ConditionalSupportWidget />
                                    </>
                                )}
                            </EnhancedToastProvider>
                        </MaterialThemeProvider>
                    </ThemeProvider>
                </AuthProvider>
            </AuthErrorBoundary>
        </QueryClientProvider>
    </StrictMode>,
);
