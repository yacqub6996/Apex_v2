import { useState } from "react";
import { Password, Star, Person, PersonAdd } from "@mui/icons-material";;
import { Progress } from "@/components/application/progress-steps/progress-steps";
import type { ProgressFeaturedIconType } from "@/components/application/progress-steps/progress-types";
import Button from '@mui/material/Button';
import { Form } from "@/components/base/form/form";
import { TextField } from "@mui/material";
import { UntitledLogoMinimal } from "@/components/foundations/logo/untitledui-logo-minimal";
import { BackgroundPattern } from "@/components/shared-assets/background-patterns";


const steps = [
    {
        title: "Your details",
        description: "Please provide your name and email",
        status: "complete",
        icon: Person,
    },
    {
        title: "Choose a password",
        description: "Choose a secure password",
        status: "current",
        icon: Password,
    },
    {
        title: "Invite your team",
        description: "Start collaborating with your team",
        status: "incomplete",
        icon: PersonAdd,
    },
    {
        title: "Add your socials",
        description: "Share posts to your social accounts",
        status: "incomplete",
        icon: Star,
    },
] as ProgressFeaturedIconType[];

export const SignupProgress03 = () => {
    const [password, setPassword] = useState("");

    return (
        <section className="flex min-h-screen flex-col items-center justify-between gap-12 overflow-hidden bg-primary px-4 py-12 md:px-8 md:pt-24 md:pb-16">
            <div className="mx-auto flex w-full flex-col gap-8 md:max-w-90">
                <div className="flex flex-col items-center gap-6 text-center md:gap-8">
                    <div className="relative">
                        <BackgroundPattern pattern="grid" className="absolute top-1/2 left-1/2 z-0 hidden -translate-x-1/2 -translate-y-1/2 md:block" />
                        <BackgroundPattern pattern="grid" size="md" className="absolute top-1/2 left-1/2 z-0 -translate-x-1/2 -translate-y-1/2 md:hidden" />
                        <UntitledLogoMinimal className="relative z-10 size-12 max-md:hidden" />
                        <UntitledLogoMinimal className="relative z-10 size-10 md:hidden" />
                    </div>
                    <div className="z-10 flex flex-col gap-2 md:gap-3">
                        <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">Choose a password</h1>
                        <p className="text-md text-tertiary">Must be at least 8 characters.</p>
                    </div>
                </div>

                <Form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const data = Object.fromEntries(new FormData(e.currentTarget));
                        console.log("Form data:", data);
                    }}
                    className="flex flex-col gap-6"
                >
                    <div className="flex flex-col gap-5">
                        <TextField
                          required
                          type="password"
                          name="password"
                          size="medium"
                          placeholder="Choose a password"
                          variant="outlined"
                          fullWidth
                          onChange={(e) => setPassword(e.target.value)}
                          sx={{ mb: 2 }}
                        />
                        <TextField
                            required
                            type="password"
                            name="password_confirm"
                            size="medium"
                            placeholder="Confirm password"
                            variant="outlined"
                            fullWidth
                            error={password !== "" && password !== undefined}
                            helperText={password !== "" && password !== undefined ? "Passwords do not match" : ""}
                            sx={{ mb: 2 }}
                        />
                    </div>

                    <div className="flex flex-col gap-4">
                        <Button type="submit" size="large">
                            Continue
                        </Button>
                    </div>
                </Form>
            </div>

            <div className="mx-auto hidden w-full max-w-container px-8 md:block">
                <Progress.TextWithLine size="sm" orientation="horizontal" items={steps} />
            </div>
            <div className="w-full md:hidden">
                <Progress.TextWithLine size="sm" orientation="vertical" items={steps} />
            </div>
        </section>
    );
};


