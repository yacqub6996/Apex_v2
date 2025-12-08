
import React, { useState } from "react";
import { toast } from "@/providers/enhanced-toast-provider";
import { useRouter } from "@tanstack/react-router";
import { GoogleLogin } from "@react-oauth/google";
import { Form } from "@/components/base/form/form";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { UntitledLogo } from "@/components/foundations/logo/untitledui-logo";
import { UntitledLogoMinimal } from "@/components/foundations/logo/untitledui-logo-minimal";
import { UsersService } from "@/api";
import { loginWithGoogle } from "@/services/google-auth";
import { publicAsset } from "@/utils/public-asset";

export const SignupSplitCarousel = () => {
    const router = useRouter();
    const HERO_VIDEO_SRC = publicAsset("assets/illustrations/new-hero_video.mp4");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const handleSignup: React.FormEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        setError(null);
        setPasswordError(null);
        setIsLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            const firstName = (formData.get("first_name") as string)?.trim();
            const lastName = (formData.get("last_name") as string)?.trim();
            const email = (formData.get("email") as string)?.trim();
            const password = formData.get("password") as string;
            const confirmPassword = formData.get("confirm_password") as string;
            const website = (formData.get("website") as string) || undefined;

            if (!password || password.length < 8) {
                setPasswordError("Password must be at least 8 characters long.");
                setIsLoading(false);
                return;
            }

            if (password !== confirmPassword) {
                setPasswordError("Passwords do not match.");
                setIsLoading(false);
                return;
            }

            const full_name = [firstName, lastName].filter(Boolean).join(" ") || undefined;

            await UsersService.usersRegisterUser({ email, password, full_name, website });
            toast.success("Account created successfully");
            // Push users to verification flow immediately
            setTimeout(() => router.navigate({ to: "/verify-email" }), 600);
        } catch (err: any) {
            let message = "Signup failed";
            if (err?.body?.detail) {
                message = String(err.body.detail);
            } else if (err?.message) {
                message = err.message;
            }
            setError(message);
        } finally {
            setIsLoading(false);
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
                                <h1 className="text-xl font-semibold text-primary md:text-2xl">Sign up</h1>
                                <p className="text-sm text-tertiary">Create your account to get started.</p>
                            </div>
                        </div>

                        <Form onSubmit={handleSignup} className="flex flex-col gap-6">
                            <div className="flex flex-col gap-5">
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <Input
                                      isRequired
                                      label="First name"
                                      type="text"
                                      name="first_name"
                                      placeholder="Enter your first name"
                                      size="md"
                                    />
                                    <Input
                                      isRequired
                                      label="Last name"
                                      type="text"
                                      name="last_name"
                                      placeholder="Enter your last name"
                                      size="md"
                                    />
                                </div>
                                <Input
                                  isRequired
                                  label="Email"
                                  type="email"
                                  name="email"
                                  placeholder="Enter your email"
                                  size="md"
                                />
                                <Input
                                  isRequired
                                  label="Password"
                                  type="password"
                                  name="password"
                                  placeholder="Create a password"
                                  size="md"
                                  hint="Minimum 8 characters; avoid reusing old passwords."
                                />
                                <Input
                                  isRequired
                                  label="Confirm password"
                                  type="password"
                                  name="confirm_password"
                                  placeholder="Re-enter your password"
                                  size="md"
                                />
                                {/* Honeypot field - hidden from users but visible to bots */}
                                <input
                                  type="text"
                                  name="website"
                                  tabIndex={-1}
                                  autoComplete="off"
                                  style={{
                                    position: 'absolute',
                                    left: '-9999px',
                                    opacity: 0,
                                    pointerEvents: 'none'
                                  }}
                                  aria-hidden="true"
                                />
                            </div>

                            <div className="flex items-start">
                                <Checkbox
                                  isRequired
                                  name="terms"
                                  size="sm"
                                  label={
                                    <span className="text-sm text-tertiary">
                                      I agree to the{" "}
                                      <Button size="sm" href="#" className="inline" color="link-color">
                                        Terms of Service
                                      </Button>
                                      {" "}and{" "}
                                      <Button size="sm" href="#" className="inline" color="link-color">
                                        Privacy Policy
                                      </Button>
                                    </span>
                                  }
                                />
                            </div>

                            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                            {error && <p className="text-sm text-red-500">{error}</p>}

                            <div className="flex flex-col gap-4">
                                <Button
                                  type="submit"
                                  size="lg"
                                  isDisabled={isLoading}
                                  isLoading={isLoading}
                                  showTextWhileLoading
                                  className="text-white"
                                >
                                    Create account
                                </Button>
                                {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                                  <div className="w-full">
                                    <GoogleLogin
                                      onSuccess={async (credentialResponse) => {
                                        try {
                                          const idToken = credentialResponse.credential;
                                          if (!idToken) throw new Error("Missing Google credential");
                                          const { role } = await loginWithGoogle(idToken);
                                          const destination = String(role).toLowerCase() === 'admin' ? '/admin/dashboard' : '/dashboard';
                                          toast.success("Account created successfully");
                                          // Force full reload so AuthProvider picks up stored token immediately
                                          setTimeout(() => { window.location.assign(destination); }, 300);
                                        } catch (e) {
                                          setError(e instanceof Error ? e.message : "Google signup failed");
                                        }
                                      }}
                                      onError={() => {
                                        setError("Google signup failed");
                                      }}
                                      useOneTap
                                      width="100%"
                                    />
                                  </div>
                                ) : null}
                            </div>
                        </Form>

                        <div className="flex justify-center gap-1 text-center">
                            <span className="text-sm text-tertiary">Already have an account?</span>
                            <Button href="/login" size="md" color="link-color">
                                Log in
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
                        src={HERO_VIDEO_SRC}
                    >
                        <source src={HERO_VIDEO_SRC} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                    <div className="absolute inset-0 bg-black/40"></div>
                </div>
                <div className="relative z-10 flex flex-col items-center gap-6 text-center">
                    <h2 className="text-4xl font-bold text-white">Rediscover New Heights</h2>
                    <p className="text-xl text-white/90">Professional trading platform with institutional-grade tools</p>
                </div>
            </div>
        </section>
        </>
    );
};
