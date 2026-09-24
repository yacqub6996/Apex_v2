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
import { AuthLoginError, useAuth } from "@/providers/auth-provider";
import { loginWithGoogle } from "@/services/google-auth";
import { EmailVerificationService } from "@/services/email-verification-service";

const RESEND_COOLDOWN_SECONDS = 60;

type FormError =
    | { kind: "credentials"; message: string }
    | { kind: "inactive"; message: string }
    | null;

type VerificationState = {
    email: string;
    maskedEmail: string;
    status: "idle" | "sending" | "sent" | "error";
    cooldown: number;
    errorMessage: string | null;
};

const maskEmail = (email: string): string => {
    const [local, domain] = email.split("@");
    if (!domain) return email;
    const maskedLocal =
        local.length > 1
            ? `${local[0]}${"•".repeat(Math.min(local.length - 1, 6))}`
            : "•";
    return `${maskedLocal}@${domain}`;
};

export const LoginSplitCarousel = () => {
    const [formError, setFormError] = useState<FormError>(null);
    const [verification, setVerification] = useState<VerificationState | null>(null);
    const router = useRouter();
    const { login, isLoading } = useAuth();

    useEffect(() => {
        if (!verification || verification.cooldown <= 0) return;
        const timer = setInterval(() => {
            setVerification((prev) => {
                if (!prev) return prev;
                const next = Math.max(prev.cooldown - 1, 0);
                return {
                    ...prev,
                    cooldown: next,
                    status: next === 0 && prev.status === "sent" ? "idle" : prev.status,
                };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [verification?.cooldown]);

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError(null);
        setVerification(null);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("username") as string;
        const password = formData.get("password") as string;

        try {
            const role = await login(email, password);
            const destination = role === "admin" ? "/admin/dashboard" : "/dashboard";
            toast.success("Logged in successfully");
            setTimeout(() => router.navigate({ to: destination }), 400);
        } catch (error) {
            if (error instanceof AuthLoginError) {
                if (error.code === "EMAIL_NOT_VERIFIED") {
                    setVerification({
                        email: email || "",
                        maskedEmail: maskEmail(email || ""),
                        status: "idle",
                        cooldown: 0,
                        errorMessage: null,
                    });
                    return;
                }
                if (error.code === "INACTIVE_ACCOUNT") {
                    setFormError({ kind: "inactive", message: error.message });
                    return;
                }
                setFormError({ kind: "credentials", message: error.message });
                return;
            }

            const message =
                error instanceof Error
                    ? error.message
                    : "We couldn't sign you in. Please check your details and try again.";
            setFormError({ kind: "credentials", message });
        }
    };

    const handleResend = async () => {
        if (!verification || verification.status === "sending" || verification.cooldown > 0) return;
        setVerification((prev) => (prev ? { ...prev, status: "sending", errorMessage: null } : prev));
        try {
            await EmailVerificationService.resendVerification(verification.email);
            setVerification((prev) =>
                prev ? { ...prev, status: "sent", cooldown: RESEND_COOLDOWN_SECONDS } : prev,
            );
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Could not resend the verification email. Please try again.";
            setVerification((prev) =>
                prev
                    ? { ...prev, status: "error", cooldown: RESEND_COOLDOWN_SECONDS, errorMessage: message }
                    : prev,
            );
        }
    };

    const resendLabel =
        verification?.cooldown && verification.cooldown > 0
            ? `Resend in ${verification.cooldown}s`
            : verification?.status === "sending"
              ? "Sending..."
              : "Resend verification";

    return (
        <>
            <section className="grid h-screen grid-cols-1 bg-primary lg:grid-cols-2">
                <div className="flex flex-col bg-primary">
                    <div className="flex flex-1 justify-center px-4 py-4 md:items-center md:px-8 md:py-8">
                        <div className="flex w-full flex-col gap-4 sm:max-w-90">
                            <div className="flex flex-col items-center gap-4">
                                <UntitledLogo className="max-md:hidden w-[165px] h-[115.5px]" />
                                <UntitledLogoMinimal className="w-[165px] h-[115.5px] md:hidden" />
                                {verification ? (
                                    <div className="flex flex-col gap-1 text-center">
                                        <h1 className="text-xl font-semibold text-primary md:text-2xl">
                                            Verify your email
                                        </h1>
                                        <p className="text-sm text-tertiary">
                                            We sent a verification link to{" "}
                                            <span className="font-medium text-primary">
                                                {verification.maskedEmail}
                                            </span>
                                            . You must verify before signing in.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1 text-center">
                                        <h1 className="text-xl font-semibold text-primary md:text-2xl">Log in</h1>
                                        <p className="text-sm text-tertiary">Welcome back! Please enter your details.</p>
                                    </div>
                                )}
                            </div>

                            {verification ? (
                                <div className="flex flex-col gap-5">
                                    <div className="flex flex-col gap-2 rounded-md bg-cyan-50 border border-cyan-200 p-3">
                                        <p className="text-sm text-cyan-800">
                                            Check your inbox for the verification email. Clicking the link in the
                                            email will sign you in automatically.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        size="lg"
                                        color="primary"
                                        isDisabled={verification.cooldown > 0 || verification.status === "sending"}
                                        isLoading={verification.status === "sending"}
                                        showTextWhileLoading
                                        onClick={handleResend}
                                    >
                                        {resendLabel}
                                    </Button>
                                    {verification.status === "sent" && (
                                        <p className="text-sm text-emerald-600">
                                            Verification email sent — check your inbox.
                                        </p>
                                    )}
                                    {verification.status === "error" && (
                                        <p className="text-sm text-red-600">{verification.errorMessage}</p>
                                    )}
                                    <Button
                                        type="button"
                                        size="md"
                                        color="link-gray"
                                        onClick={() => {
                                            setVerification(null);
                                            setFormError(null);
                                        }}
                                    >
                                        Use a different account
                                    </Button>
                                </div>
                            ) : (
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

                                    {formError && (
                                        <div className="flex flex-col gap-2 rounded-md bg-red-50 border border-red-200 p-3">
                                            <p className="text-sm text-red-700">{formError.message}</p>
                                            {formError.kind === "credentials" && (
                                                <div className="text-sm">
                                                    <Button href="/signup" size="sm" color="link-color">
                                                        Sign up
                                                    </Button>
                                                    <span className="text-tertiary"> to create a new account.</span>
                                                </div>
                                            )}
                                            {formError.kind === "inactive" && (
                                                <span className="text-tertiary">
                                                    Contact support if you believe this is a mistake.
                                                </span>
                                            )}
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
                                                        setFormError({
                                                            kind: "credentials",
                                                            message: e instanceof Error ? e.message : "Google login failed",
                                                        });
                                                    }
                                                }}
                                                onError={() => {
                                                    setFormError({ kind: "credentials", message: "Google login failed" });
                                                }}
                                                useOneTap
                                            />
                                        ) : null}
                                    </div>
                                </Form>
                            )}

                            {!verification && (
                                <div className="flex justify-center gap-1 text-center">
                                    <span className="text-sm text-tertiary">Don't have an account?</span>
                                    <Button href="/signup" size="md" color="link-color">
                                        Sign up
                                    </Button>
                                </div>
                            )}
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
