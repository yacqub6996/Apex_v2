import Button from '@mui/material/Button';
import { Form } from "@/components/base/form/form";
import { TextField } from "@mui/material";
import { UntitledLogo } from "@/components/foundations/logo/untitledui-logo";

export const FooterLarge08Brand = () => {
    return (
        <footer className="bg-brand-section py-12 md:pt-16">
            <div className="mx-auto max-w-container px-4 md:px-8">
                <div className="flex flex-col justify-between gap-x-8 gap-y-12 lg:flex-row">
                    <div className="flex flex-col gap-8 md:items-start">
                        <UntitledLogo className="dark-mode" />
                        <nav>
                            <ul className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-[repeat(6,max-content)]">
                                {[
                                    {
                                        label: "Overview",
                                        href: "#",
                                    },
                                    {
                                        label: "Features",
                                        href: "#",
                                    },
                                    {
                                        label: "Pricing",
                                        href: "#",
                                    },
                                    {
                                        label: "Careers",
                                        href: "#",
                                    },
                                    {
                                        label: "Help",
                                        href: "#",
                                    },
                                    {
                                        label: "Privacy",
                                        href: "#",
                                    },
                                ].map((item) => (
                                    <li key={item.label}>
                                        <Button className="text-footer-button-fg hover:text-footer-button-fg_hover" size="large" href="item.href" variant="text">
                                            {item.label}
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>

                    <Form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const data = Object.fromEntries(new FormData(e.currentTarget));
                            console.log("Form data:", data);
                        }}
                        className="flex w-full flex-col gap-4 sm:max-w-90"
                    >
                        <label htmlFor="newsletters-email" className="text-sm font-medium text-primary_on-brand">
                            Stay up to date
                        </label>
                        <div className="flex flex-col gap-4 sm:flex-row">
                            <TextField
                                required
                                id="newsletters-email"
                                name="email"
                                type="email"
                                placeholder="Enter your email"
                                size="medium"
                                variant="outlined"
                                fullWidth
                                sx={{ mb: 2 }}
                            />
                            <Button type="submit" size="large">
                                Subscribe
                            </Button>
                        </div>
                    </Form>
                </div>
                <div className="mt-12 flex flex-col-reverse justify-between gap-4 border-t border-brand_alt pt-8 md:mt-16 md:flex-row md:gap-6">
                    <p className="text-md text-quaternary_on-brand">&copy; {new Date().getFullYear()} Apex Trades. All rights reserved.</p>

                    <ul className="flex gap-4">
                        {[
                            {
                                label: "Terms",
                                href: "#",
                            },
                            {
                                label: "Privacy",
                                href: "#",
                            },
                            {
                                label: "Cookies",
                                href: "#",
                            },
                        ].map(({ label, href }) => (
                            <li key={label}>
                                <a
                                    href={href}
                                    className="rounded-xs text-md text-quaternary_on-brand outline-focus-ring transition duration-100 ease-linear hover:text-tertiary_on-brand focus-visible:outline-2 focus-visible:outline-offset-2"
                                >
                                    {label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </footer>
    );
};


