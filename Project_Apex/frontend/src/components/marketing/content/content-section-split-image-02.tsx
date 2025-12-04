import Button from '@mui/material/Button';
import { StarIcon } from "@/components/foundations/rating-stars";
import { useAuth } from "@/providers/auth-provider";

export const ContentSectionSplitImage02 = () => {
    const { user } = useAuth();
    const copyTradingHref = user?.id ? "/dashboard/copy-trading" : "/signup";
    return (
        <section className="bg-primary py-6 md:py-10">
            <div className="mx-auto grid w-full max-w-container grid-cols-1 gap-12 px-4 md:gap-16 md:px-8 lg:grid-cols-2">
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-brand-secondary md:text-md">Case study</span>
                    <h2 className="mt-3 text-display-sm font-semibold text-primary md:text-display-md">Copy trading with guardrails at Meridian</h2>
                    <div className="prose mt-12 md:prose-lg">
                        <hr />
                        <p>
                            Meridian’s desk wanted a compliant way for their community to mirror trades without giving up custody. Apex provided per-trade
                            transparency, allocation caps, and one-click pause controls.
                        </p>
                        <p>
                            After onboarding, followers allocated within tier ranges (Foundation/Growth/Elite). Admin ROI pushes and CSV exports simplified
                            monthly reporting while encryption-at-rest kept documents secure.
                        </p>

                        <h3 className="mb-4! text-display-xs! font-semibold md:mt-8">Results</h3>
                        <p>• Zero custody change. • Faster closes via ROI exports. • Fewer support tickets thanks to guardrails and instant pause.</p>
                    </div>
                    <div className="mt-12 hidden gap-3 md:flex">
                        <Button size="large" variant="contained" href={copyTradingHref}>
                            Explore copy trading
                        </Button>
                        <Button size="large" href="#security">Security details</Button>
                    </div>
                </div>

                <div className="relative h-140 lg:h-160">
                    <img src="https://www.untitledui.com/images/portraits/lulu-meyers" className="size-full object-cover" alt="Meridian desk" />

                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/40 to-black/0 pt-16 md:pt-20 lg:pt-24">
                        <div className="relative flex flex-col gap-1.5 bg-primary/30 p-4 pb-5 backdrop-blur-[10px] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-alpha-white/30 md:gap-2 md:p-6">
                            <div className="flex flex-col-reverse justify-between gap-4 md:flex-row">
                                <p className="text-xl font-semibold whitespace-nowrap text-white md:text-display-xs">Meridian Desk</p>

                                <div aria-hidden="true" className="flex gap-1">
                                    <StarIcon className="text-white" />
                                    <StarIcon className="text-white" />
                                    <StarIcon className="text-white" />
                                    <StarIcon className="text-white" />
                                    <StarIcon className="text-white" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-0.5">
                                <p className="text-md font-semibold text-white">Copy trading program</p>
                                <p className="text-sm font-medium text-white">Policy-based guardrails</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 md:hidden">
                    <Button size="large" href="#security">Security details</Button>
                    <Button size="large" variant="contained" href={copyTradingHref}>
                        Explore copy trading
                    </Button>
                </div>
            </div>
        </section>
    );
};
