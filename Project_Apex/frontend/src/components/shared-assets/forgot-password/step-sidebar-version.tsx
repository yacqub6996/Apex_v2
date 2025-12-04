import { ArrowBack, Key, Mail, Password, Star, Person, PersonAdd } from "@mui/icons-material";
import { PaginationDot } from "@/components/application/pagination/pagination-dot";
import { Progress } from "@/components/application/progress-steps/progress-steps";
import type { ProgressFeaturedIconType } from "@/components/application/progress-steps/progress-types";
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { Form } from "@/components/base/form/form";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { UntitledLogo } from "@/components/foundations/logo/untitledui-logo";
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

export const StepSidebarVersion = () => {
    return (
        <section className="grid min-h-screen grid-cols-1 overflow-hidden bg-primary md:grid-cols-[440px_1fr]">
            <div className="hidden flex-1 flex-col bg-secondary md:flex">
                <div className="flex flex-col gap-20 px-8 pt-12">
                    <UntitledLogo />

                    <Progress.IconsWithText type="featured-icon" size="md" items={steps} />
                </div>
                <footer className="mt-auto flex items-center justify-between p-8">
                    <p className="text-sm text-tertiary">&copy; {new Date().getFullYear()} Apex Trades</p>
                    <span className="flex items-center justify-center gap-2">
                        <Mail className="size-4 text-fg-quaternary" />
                        <p className="text-sm text-tertiary">help@untitledui.com</p>
                    </span>
                </footer>
            </div>
            <div className="flex flex-1 px-4 py-12 md:px-8 md:pt-40">
                <div className="mx-auto flex w-full max-w-90 flex-col gap-8">
                    <div className="flex flex-col items-center gap-6 text-center">
                        <div className="relative">
                            <FeaturedIcon color="gray" theme="modern" size="xl" className="z-10">
                                <Key className="size-7" />
                            </FeaturedIcon>
                            <BackgroundPattern
                                size="lg"
                                pattern="grid"
                                className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block"
                            />
                            <BackgroundPattern size="md" pattern="grid" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:hidden" />
                        </div>

                        <div className="z-10 flex flex-col gap-2 md:gap-3">
                            <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">Forgot password?</h1>
                            <p className="self-stretch text-md text-tertiary">No worries, we'll send you reset instructions.</p>
                        </div>
                    </div>

                    <Form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const data = Object.fromEntries(new FormData(e.currentTarget));
                            console.log("Form data:", data);
                        }}
                        className="z-10 flex flex-col gap-6"
                    >
                        <TextField
                          required
                          label="Email"
                          type="email"
                          name="email"
                          placeholder="Enter your email"
                          variant="outlined"
                          fullWidth
                        />

                        <div className="flex flex-col gap-4">
                            <Button type="submit" size="large">
                                Reset password
                            </Button>
                        </div>
                    </Form>

                    <div className="z-10 flex justify-center gap-1 text-center">
                        <Button size="medium" href="#" className="mx-auto" variant="text" startIcon={<ArrowBack />}>
                            Back to log in
                        </Button>
                    </div>
                    <div className="mx-auto">
                        <PaginationDot size="lg" page={2} total={4} />
                    </div>
                </div>
            </div>
        </section>
    );
};


