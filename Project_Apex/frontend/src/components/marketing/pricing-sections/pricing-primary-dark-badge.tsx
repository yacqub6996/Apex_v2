import { useState } from "react";
import { Tab, TabList, Tabs } from "@/components/application/tabs/tabs";
import { PricingTierCardBadgeGroup } from "@/components/marketing/pricing-sections/base-components/pricing-tier-card";

export const PricingPrimaryDarkBadge = () => {
    const [selectedPlan, setSelectedPlan] = useState(0); // 0 for monthly, 1 for annually

    const plans = [
        {
            title: "Basic plan",
            subtitle: selectedPlan === 1 ? "$9/m" : "$10/mth",
            description: "Our most popular plan.",
            features: [
                "Access to all basic features",
                "Basic reporting and analytics",
                "Up to 10 individual users",
                "20 GB individual data",
                "Basic chat and email support",
            ],
        },
        {
            title: "Business plan",
            subtitle: selectedPlan === 1 ? "$15/m" : "$20/mth",
            description: "Growing teams up to 20 users.",
            badge: "Popular",
            isMostPopular: true,
            features: [
                "200+ integrations",
                "Advanced reporting and analytics",
                "Up to 20 individual users",
                "40 GB individual data",
                "Priority chat and email support",
            ],
        },
        {
            title: "Enterprise plan",
            subtitle: selectedPlan === 1 ? "$39/m" : "$40/mth",
            description: "Advanced features + unlimited users.",
            badge: "Popular",
            features: [
                "Advanced custom fields",
                "Audit log and data history",
                "Unlimited individual users",
                "Unlimited individual data",
                "Personalized + priority service",
            ],
        },
    ];

    return (
        <section className="bg-primary">
            <div className="bg-brand-section pt-16 pb-32 md:pt-24 md:pb-40">
                <div className="mx-auto max-w-container px-4 md:px-8">
                    <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
                        <p className="text-sm font-semibold text-secondary_on-brand md:text-md">Pricing</p>
                        <h2 className="mt-3 text-display-md font-semibold text-primary_on-brand md:text-display-lg">Pricing plans</h2>
                        <p className="mt-4 text-lg text-secondary_on-brand md:mt-6 md:text-xl">
                            Simple, transparent pricing that grows with you. Try any plan free for 30 days.
                        </p>

                        <Tabs
                            value={selectedPlan}
                            onChange={(_event, newValue) => setSelectedPlan(newValue)}
                            className="mt-8 w-full md:mt-12 md:w-auto"
                        >
                            <TabList
                                customVariant="button-gray"
                                size="md"
                                className="[&_[role=tab]]:flex-1 [&_[role=tab]]:text-secondary_on-brand [&_[role=tab]]:hover:bg-white/10 [&_[role=tab]]:selected:bg-brand-primary_alt [&_[role=tab]]:selected:text-brand-secondary"
                            >
                                <Tab label="Monthly billing" />
                                <Tab label="Annual billing" />
                            </TabList>
                        </Tabs>
                    </div>
                </div>
            </div>

            <div className="m-auto -mt-16 max-w-container px-4 pb-16 md:-mt-24 md:px-8 md:pb-24">
                <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
                    {plans.map((plan) => (
                        <PricingTierCardBadgeGroup key={plan.title} {...plan} />
                    ))}
                </div>
            </div>
        </section>
    );
};

