import { GoogleLogin } from "@react-oauth/google";
import { Form } from "@/components/base/form/form";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { UntitledLogo } from "@/components/foundations/logo/untitledui-logo";
import { UntitledLogoMinimal } from "@/components/foundations/logo/untitledui-logo-minimal";
import { useEffect, useState } from "react";
import { toast } from "@/providers/enhanced-toast-provider";
import { useRouter } from "@tanstack/react-router";
import { useAuth } from "@/providers/auth-provider";
import { loginWithGoogle } from "@/services/google-auth";

export const LoginSplitCarousel = () => {
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { login, isLoading } = useAuth();

    // Use sessionStorage instead of localStorage for login errors
    // This ensures errors disappear when user closes tab or refreshes
    useEffect(() => {
        try {
            const flag = window.sessionStorage.getItem("apex_login_error");
            if (flag) {
                setError("We couldn't sign you in. If you don't have an account yet, please sign up.");
                window.sessionStorage.removeItem("apex_login_error");
            }
        } catch {
            // ignore storage access issues
        }
    }, []);

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("username") as string;
        const password = formData.get("password") as string;

        try {
            const role = await login(email, password);
            const destination = role === "admin" ? "/admin/dashboard" : "/dashboard";
            toast.success("Logged in successfully");
            setTimeout(() => router.navigate({ to: destination }), 400);
        } catch (error) {
            // Use sessionStorage instead of localStorage for transient error state
            try {
                window.sessionStorage.setItem("apex_login_error", "1");
            } catch {
                // ignore storage issues
            }
            setError("We couldn't sign you in. If you don't have an account yet, please sign up.");
        }
    };

    return (
        <>
            <section className="grid h-screen grid-cols-1 bg-primary lg:grid-cols-2">
                <div className="flex flex-col bg-primary">
                    <div className="flex flex-1 justify-center px-4 py-4 md:items-center md:px-8 md:py-8">
                        <div className="flex w-full flex-col gap-4 sm:max-w-90">
                            <div className="flex flex-col items-center gap-4">
                                <UntitledLogo className="max-md:hidden w-[165px] h-[115.5px]" />
                                <UntitledLogoMinimal className="w-[165px] h-[115.5px] md:hidden" />
                                <div className="flex flex-col gap-1 text-center">
                                    <h1 className="text-xl font-semibold text-primary md:text-2xl">Log in</h1>
                                    <p className="text-sm text-tertiary">Welcome back! Please enter your details.</p>
                                </div>
                            </div>

                            <Form onSubmit={handleLogin} className="flex flex-col gap-6">
                                <fieldset disabled={isLoading} className="flex flex-col gap-5">
                                    <Input
                                        isRequired
                                        label="Email"
                                        type="email"
                                        name="username"
                                        placeholder="Enter your email"
                                        size="md"
                                    />
                                    <Input
                                        isRequired
                                        label="Password"
                                        type="password"
                                        name="password"
                                        placeholder="Enter your password"
                                        size="md"
                                        hint="Minimum 8 characters."
                                    />
                                </fieldset>

                                {error && (
                                    <div className="flex flex-col gap-2 rounded-md bg-red-50 border border-red-200 p-3">
                                        <p className="text-sm text-red-700">{error}</p>
                                        <div className="text-sm">
                                            <Button href="/signup" size="sm" color="link-color">
                                                Sign up
                                            </Button>
                                            <span className="text-tertiary"> to create a new account.</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center">
                                    <Checkbox name="remember" label="Remember for 30 days" size="sm" />

                                    <Button size="md" href="/auth/reset" className="ml-auto" color="link-gray">
                                        Forgot password
                                    </Button>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <Button type="submit" size="lg" isDisabled={isLoading} isLoading={isLoading}>
                                        Sign in
                                    </Button>
                                    {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                                        <GoogleLogin
                                            onSuccess={async (credentialResponse) => {
                                                try {
                                                    const idToken = credentialResponse.credential;
                                                    if (!idToken) throw new Error("Missing Google credential");
                                                    const { role } = await loginWithGoogle(idToken);
                                                    const destination =
                                                        String(role).toLowerCase() === "admin"
                                                            ? "/admin/dashboard"
                                                            : "/dashboard";
                                                    toast.success("Logged in successfully");
                                                    // Force full reload so AuthProvider picks up stored token immediately
                                                    setTimeout(() => {
                                                        window.location.assign(destination);
                                                    }, 300);
                                                } catch (e) {
                                                    setError(e instanceof Error ? e.message : "Google login failed");
                                                }
                                            }}
                                            onError={() => {
                                                setError("Google login failed");
                                            }}
                                            useOneTap
                                        />
                                    ) : null}
                                </div>
                            </Form>

                            <div className="flex justify-center gap-1 text-center">
                                <span className="text-sm text-tertiary">Don't have an account?</span>
                                <Button href="/signup" size="md" color="link-color">
                                    Sign up
                                </Button>
                            </div>
                        </div>
                    </div>

                    <footer className="hidden p-8 pt-11 lg:block">
                        <p className="text-sm text-tertiary">&copy; {new Date().getFullYear()} Apex Trades</p>
                    </footer>
                </div>

                <div className="relative hidden items-center justify-center overflow-hidden bg-brand-section lg:flex">
                    <div className="absolute inset-0">
                        <video
                            className="w-full h-full object-cover"
                            autoPlay
                            loop
                            muted
                            playsInline
                            src="/assets/illustrations/new-hero_video.mp4"
                        >
                            <source src="/assets/illustrations/new-hero_video.mp4" type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                        <div className="absolute inset-0 bg-black/40"></div>
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-6 text-center">
                        <h2 className="text-4xl font-bold text-white">Rediscover New Heights</h2>
                        <p className="text-xl text-white/90">
                            Professional trading platform with institutional-grade tools
                        </p>
                    </div>
                </div>
            </section>
        </>
    );
};

