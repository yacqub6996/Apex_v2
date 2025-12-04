import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import { useRouter } from '@tanstack/react-router';
import { Button } from '@/components/base/buttons/button';
import { UntitledLogo } from '@/components/foundations/logo/untitledui-logo';
import { UntitledLogoMinimal } from '@/components/foundations/logo/untitledui-logo-minimal';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { publicAsset } from '@/utils/public-asset';
import { useAuth } from '@/providers/auth-provider';
import { EmailVerificationService } from '@/services/email-verification-service';
import { toast } from '@/providers/enhanced-toast-provider';
import { useEffect } from 'react';

export const SignupOnboarding = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const isVerified = Boolean(user?.email_verified);

  const HERO_VIDEO_SRC = publicAsset("assets/illustrations/new-hero_video.mp4");

  // Minimize the flow: this page simply routes users to the right place.
  useEffect(() => {
    if (isVerified) {
      router.navigate({ to: '/dashboard' });
    } else {
      router.navigate({ to: '/verify-email' });
    }
  }, [isVerified, router]);

  const nextSteps = [
    {
      title: "Email verification",
      description:
        "We've sent a verification link to your inbox. Confirm it to secure your account and unlock onboarding.",
    },
    {
      title: "Complete KYC",
      description:
        "After logging in, complete your identity verification to unlock withdrawals and higher trading limits.",
    },
    {
      title: "Start trading",
      description:
        "Once verified, deposit funds and begin copy trading or investing in long-term plans with confidence.",
    },
  ];

  const valueProps = [
    {
      title: "Copy expert traders",
      description: "Automatically replicate trades from verified professional traders",
    },
    {
      title: "Long-term investment plans",
      description: "Secure your future with lock-period investment plans",
    },
    {
      title: "Bank-grade security",
      description: "Your funds and data are protected with industry-leading security",
    },
  ];

  const backgroundOverlayStyle: CSSProperties = {
    background:
      'radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--color-brand-500) 32%, transparent) 0, transparent 32%),\
      radial-gradient(circle at 80% 10%, color-mix(in srgb, var(--color-brand-600) 26%, transparent) 0, transparent 28%),\
      radial-gradient(circle at 40% 80%, color-mix(in srgb, var(--color-success-500) 18%, transparent) 0, transparent 28%)',
  };

  const gradientWashStyle: CSSProperties = {
    background:
      'linear-gradient(180deg, color-mix(in srgb, var(--color-bg-primary) 85%, transparent) 0%, color-mix(in srgb, var(--color-bg-primary-solid) 92%, transparent) 80%)',
  };

  const surfaceStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--color-bg-primary) 88%, transparent)',
    borderColor: 'color-mix(in srgb, var(--color-border-primary) 45%, transparent)',
    boxShadow: '0 24px 120px color-mix(in srgb, var(--color-bg-primary-solid) 45%, transparent)',
  };

  const secondarySurfaceStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--color-bg-secondary, transparent) 70%, transparent)',
    borderColor: 'color-mix(in srgb, var(--color-border-secondary, var(--color-border-primary)) 55%, transparent)',
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="pointer-events-none absolute inset-0" style={backgroundOverlayStyle} />
      <div className="absolute inset-0" style={gradientWashStyle} />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col justify-center px-4 py-10 lg:flex-row lg:items-center lg:gap-12">
        <div
          className="w-full max-w-2xl space-y-8 rounded-3xl border p-8 shadow-[0_24px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-10"
          style={surfaceStyle}
        >
            <div className="flex flex-col items-center text-center">
              <UntitledLogo className="max-md:hidden mb-3 h-[115.5px] w-[165px]" />
              <UntitledLogoMinimal className="md:hidden mb-3 h-[115.5px] w-[165px]" />

            <div className="mb-5 inline-flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-success-500)]/25 via-[var(--color-brand-500)]/25 to-[var(--color-brand-600)]/30 text-[color:var(--color-text-primary_on-brand,var(--color-white))] ring-1 ring-[color:var(--color-border-primary)]/20">
              <VerifiedRoundedIcon className="size-8" />
            </div>

            <h1 className="mb-2 text-display-xs font-semibold text-[color:var(--color-text-primary)] md:text-display-sm">
              Welcome to Apex!
            </h1>
            <p className="text-md text-[color:var(--color-text-secondary)]">
              Your account has been created. Let's get you to the trading floor.
            </p>
          </div>

          <div className="space-y-5">
            <div
              className="rounded-2xl border p-4 shadow-inner shadow-black/10"
              style={secondarySurfaceStyle}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">Email verification required</p>
                <span className="rounded-full border px-3 py-1 text-xs uppercase tracking-wide text-[color:var(--color-text-secondary)]" style={secondarySurfaceStyle}>
                  {isVerified ? 'Verified' : 'Pending'}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[color:var(--color-text-secondary)]">
                {isVerified
                  ? "You're verified. Continue to the dashboard to finish setup."
                  : "Check your inbox and click the verification link. You must verify before accessing your dashboard."}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button
                  size="md"
                  color="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => router.navigate({ to: '/verify-email' })}
                >
                  Open verification page
                </Button>
                <Button
                  size="md"
                  color="secondary"
                  className="w-full sm:w-auto"
                  isDisabled={!isAuthenticated || isVerified}
                  onClick={async () => {
                    if (!isAuthenticated) {
                      toast.info("Login to request another verification email.");
                      return;
                    }
                    try {
                      await EmailVerificationService.requestVerification();
                      toast.success("Verification email resent.");
                    } catch (err: any) {
                      const detail = err?.body?.detail || err?.message || "Could not resend verification email.";
                      toast.error(String(detail));
                    }
                  }}
                >
                  Resend email
                </Button>
                <Button
                  size="md"
                  color="primary"
                  className="w-full sm:w-auto"
                  onClick={() => router.navigate({ to: '/dashboard' })}
                  isDisabled={!isVerified || !isAuthenticated}
                >
                  Go to dashboard
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border p-6 shadow-inner shadow-black/10" style={secondarySurfaceStyle}>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-md font-semibold text-[color:var(--color-text-primary)]">What happens next</p>
                <span className="rounded-full border px-3 py-1 text-xs uppercase tracking-wide text-[color:var(--color-text-secondary)]" style={secondarySurfaceStyle}>
                  Guided onboarding
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {nextSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="group rounded-xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5"
                    style={{
                      background: 'color-mix(in srgb, var(--color-bg-primary) 82%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--color-border-primary) 35%, transparent)',
                    }}
                  >
                    <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-[color:var(--color-text-primary)]" style={secondarySurfaceStyle}>
                      {index + 1}
                    </div>
                    <p className="mb-1 text-sm font-semibold text-[color:var(--color-text-primary)]">{step.title}</p>
                    <p className="text-xs leading-relaxed text-[color:var(--color-text-secondary)]">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-2xl border p-5"
              style={{
                background: 'color-mix(in srgb, var(--color-utility-blue-50, rgba(59,130,246,0.1)) 80%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-utility-blue-200, rgba(59,130,246,0.35)) 80%, transparent)',
                color: 'var(--color-text-primary)',
              }}
            >
              <p className="text-sm leading-relaxed text-[color:var(--color-text-secondary)]">
                <strong className="text-[color:var(--color-text-primary)]">Check your inbox:</strong> We just sent a verification email. Open it to confirm your address and finish onboarding. Didn't get it? Check spam or request another from the login page.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              size="lg"
              color="primary"
              onClick={() => router.navigate({ to: '/verify-email' })}
              className="w-full bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-600)] text-[color:var(--color-text-primary_on-brand,var(--color-white))] shadow-lg shadow-[color:var(--color-brand-500)]/25"
            >
              Go to verification page
            </Button>

            <div className="flex items-center justify-center gap-2 text-sm text-[color:var(--color-text-secondary)]">
              <span>Have questions?</span>
              <Button href="/support" color="link-color" size="sm">
                Contact Support
              </Button>
            </div>
          </div>
        </div>

        <div
          className="relative mt-10 hidden flex-1 items-center justify-center overflow-hidden rounded-3xl border shadow-[0_18px_80px_rgba(0,0,0,0.25)] lg:mt-0 lg:flex"
          style={surfaceStyle}
        >
          <div className="absolute inset-0">
            <video
              className="h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              src={HERO_VIDEO_SRC}
            >
              <source src={HERO_VIDEO_SRC} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />
          </div>

          <div className="relative z-10 max-w-xl p-8">
            <p className="mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-secondary)]" style={secondarySurfaceStyle}>
              Apex advantage
            </p>
            <h2 className="mb-3 text-display-sm font-semibold text-[color:var(--color-text-primary)] md:text-display-md">
              Built for confident trading
            </h2>
            <p className="mb-6 text-base text-[color:var(--color-text-secondary)]">
              Join thousands of traders who trust Apex for copy trading, long-term investments, and professional portfolio management.
            </p>
            <div className="space-y-4">
              {valueProps.map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex size-6 items-center justify-center rounded-full text-[color:var(--color-text-primary)]" style={secondarySurfaceStyle}>
                    <CheckCircleRoundedIcon className="size-4" />
                  </span>
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-[color:var(--color-text-primary)]">{item.title}</h3>
                    <p className="text-xs leading-relaxed text-[color:var(--color-text-secondary)]">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};
