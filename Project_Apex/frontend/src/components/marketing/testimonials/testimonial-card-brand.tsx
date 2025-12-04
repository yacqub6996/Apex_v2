import Avatar from "@mui/material/Avatar";

export const TestimonialCardBrand = () => {
    return (
        <section className="bg-primary py-16 md:py-24">
            <div className="mx-auto max-w-container px-4 md:px-8">
                <figure className="flex flex-col gap-6 rounded-2xl bg-brand-section px-6 py-10 text-center text-balance md:gap-8 md:px-8 md:py-12 lg:p-16">
                    <div className="flex flex-col gap-3">
                        <span className="text-sm font-semibold text-secondary_on-brand">Financial Services</span>
                        <blockquote className="text-display-xs font-medium text-white sm:text-display-sm md:text-display-md">
                            Untitled has saved us thousands of hours of work. We're able to spin up projects and features faster.
                        </blockquote>
                    </div>
                    <figcaption className="flex justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <Avatar
                              src="https://www.untitledui.com/images/avatars/fleur-cook?fm=webp&q=80"
                              alt="Fleur Cook"
                              sx={{ width: 56, height: 56 }}
                            />
                            <div className="flex flex-col gap-1">
                                <p className="text-md font-semibold text-primary_on-brand">Fleur Cook</p>
                                <cite className="text-sm text-tertiary_on-brand not-italic">Web Developer, Sisyphus</cite>
                            </div>
                        </div>
                    </figcaption>
                </figure>
            </div>
        </section>
    );
};

