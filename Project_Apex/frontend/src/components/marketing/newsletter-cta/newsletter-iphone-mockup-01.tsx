import Button from '@mui/material/Button';
import { Form } from "@/components/base/form/form";
import { TextField } from "@mui/material";
import { IPhoneMockup } from "@/components/shared-assets/iphone-mockup";

export const NewsletterIPhoneMockup01 = () => {
    return (
        <section className="overflow-hidden bg-primary pt-16 md:py-24">
            <div className="relative mx-auto grid w-full max-w-container grid-cols-1 gap-16 px-4 md:px-8 lg:grid-cols-2 lg:items-center">
                <div className="z-20 flex flex-col items-start md:max-w-xl md:pr-18">
                    <h2 className="text-display-sm font-semibold text-primary md:text-display-md lg:text-display-lg">Be the first to know when we launch</h2>
                    <p className="mt-4 text-lg text-tertiary md:mt-6 md:text-xl">
                        We're still building. Subscribe for updates and 20% off when we launch. <span className="max-md:hidden">No spam, we promise!</span>
                    </p>
                    <Form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const data = Object.fromEntries(new FormData(e.currentTarget));
                            console.log("Form data:", data);
                        }}
                        className="mt-8 flex w-full flex-col gap-4 md:mt-12 md:max-w-120 md:flex-row"
                    >
                        <TextField
                            required
                            size="medium"
                            name="email"
                            type="email"
                            placeholder="Enter your email"
                            variant="outlined"
                            fullWidth
                            helperText={
                                <span>
                                    We care about your data in our{" "}
                                    <a
                                        href="#"
                                        className="rounded-xs underline underline-offset-3 outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                                    >
                                        privacy policy
                                    </a>
                                    .
                                </span>
                            }
                            sx={{ mb: 2, maxWidth: '345px' }}
                        />
                        <Button type="submit" size="large">
                            Subscribe
                        </Button>
                    </Form>
                </div>

                <div className="relative min-h-90 md:min-h-100 md:w-full">
                    <svg className="absolute -bottom-24 left-1/2 -translate-x-1/2" width="532" height="416" viewBox="0 0 532 416" fill="none">
                        <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M182.034 461.691C74.9901 428.768 1.32278 329.846 0.0121784 217.408C-1.15817 117.003 82.1936 43.2414 176.777 10.7273C260.07 -17.9056 346.327 12.9156 406.143 77.7959C484.913 163.236 571.343 274.645 512.702 375.097C449.003 484.212 302.448 498.727 182.034 461.691Z"
                            fill="currentColor"
                            className="text-bg-secondary"
                        />
                    </svg>

                    <IPhoneMockup
                        image="https://www.untitledui.com/marketing/screen-mockups/dashboard-mobile-mockup-light-01.webp"
                        imageDark="https://www.untitledui.com/marketing/screen-mockups/dashboard-mobile-mockup-dark-01.webp"
                        className="absolute top-0 right-1/2 w-full max-w-71 translate-x-1/2 md:max-w-78.5 md:drop-shadow-iphone-mockup"
                    />
                </div>
            </div>
        </section>
    );
};

