import Button from '@mui/material/Button';

export const CTAAbstractImagesBrand = () => {
    return (
        <section className="bg-brand-section py-6 lg:py-10">
            <div className="mx-auto grid max-w-container grid-cols-1 gap-16 overflow-hidden px-4 md:px-8 lg:grid-cols-2 lg:items-center">
                <div className="flex max-w-3xl flex-col items-start">
                    <h2 className="text-display-sm font-semibold text-primary_on-brand md:text-display-md lg:text-display-lg">
                        Ready to allocate with guardrails?
                    </h2>
                    <p className="mt-4 text-lg text-tertiary_on-brand md:mt-6 md:text-xl">Create your account or review plans to choose your range.</p>

                    <div className="mt-8 flex w-full flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-start md:mt-12">
                        <Button size="large" className="shadow-xs! ring-0" variant="contained" href="#pricing">
                            See plans
                        </Button>
                        <Button size="large" href="/signup">Get started</Button>
                    </div>
                </div>

                <div className="grid h-122 w-[150%] grid-cols-[repeat(12,1fr)] grid-rows-[repeat(12,1fr)] gap-2 justify-self-center sm:h-124 sm:w-[120%] md:w-auto md:gap-4">
                    <img
                        src="https://www.untitledui.com/marketing/smiling-girl-5.webp"
                        className="size-full object-cover [grid-area:3/3/7/7]"
                        alt="Smiling girl"
                    />
                    <img
                        src="https://www.untitledui.com/marketing/abstract-image-02.webp"
                        className="size-full object-cover [grid-area:1/7/7/11]"
                        alt="Abstract image"
                    />
                    <img
                        src="https://www.untitledui.com/marketing/abstract-image-03.webp"
                        className="size-full object-cover [grid-area:7/5/13/9]"
                        alt="Abstract image"
                    />
                    <img
                        src="https://www.untitledui.com/marketing/smiling-girl-6.webp"
                        className="size-full object-cover [grid-area:7/9/10/13]"
                        alt="Smiling girl"
                    />
                    <img
                        src="https://www.untitledui.com/marketing/smiling-girl-2.webp"
                        className="size-full object-cover [grid-area:7/1/10/5]"
                        alt="Smiling girl"
                    />
                </div>
            </div>
        </section>
    );
};
