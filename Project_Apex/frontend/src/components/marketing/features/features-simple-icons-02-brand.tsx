import { ShowChart, KeyboardCommandKey, Chat, Favorite, EmojiEmotions, FlashOn } from "@mui/icons-material";;
import { FeatureTextFeaturedIconTopCenteredBrand } from "@/components/marketing/features/base-components/feature-text";

const features = [
    {
        title: "Share team inboxes",
        subtitle: "Whether you have a team of 2 or 200, our shared team inboxes keep everyone on the same page and in the loop.",
        icon: Chat,
    },
    {
        title: "Deliver instant answers",
        subtitle: "An all-in-one customer service platform that helps you balance everything your customers need to be happy.",
        icon: FlashOn,
    },
    {
        title: "Manage your team with reports",
        subtitle: "Measure what matters with Untitled's easy-to-use reports. You can filter, export, and drilldown on the data in a couple clicks.",
        icon: ShowChart,
    },
    {
        title: "Connect with customers",
        subtitle: "Solve a problem or close a sale in real-time with chat. If no one is available, customers are seamlessly routed to email without confusion.",
        icon: EmojiEmotions,
    },
    {
        title: "Connect the tools you already use",
        subtitle: "Explore 100+ integrations that make your day-to-day workflow more efficient and familiar. Plus, our extensive developer tools.",
        icon: KeyboardCommandKey,
    },
    {
        title: "Our people make the difference",
        subtitle: "We're an extension of your customer service team, and all of our resources are free. Chat to our friendly team 24/7 when you need help.",
        icon: Favorite,
    },
];

export const FeaturesSimpleIcons02Brand = () => {
    return (
        <section className="bg-brand-section py-16 md:py-24">
            <div className="mx-auto max-w-container px-4 md:px-8">
                <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
                    <span className="text-sm font-semibold text-secondary_on-brand md:text-md">Features</span>
                    <h2 className="mt-3 text-display-sm font-semibold text-primary_on-brand md:text-display-md">Beautiful analytics to grow smarter</h2>
                    <p className="mt-4 text-lg text-secondary_on-brand md:mt-5 md:text-xl">
                        Powerful, self-serve product and growth analytics to help you convert, engage, and retain more users. Trusted by over 4,000 startups.
                    </p>
                </div>

                <div className="mt-12 md:mt-16">
                    <ul className="grid w-full grid-cols-1 justify-items-center gap-x-8 gap-y-10 sm:grid-cols-2 md:gap-y-16 lg:grid-cols-3">
                        {features.map((item) => (
                            <li key={item.title}>
                                <FeatureTextFeaturedIconTopCenteredBrand {...item} />
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
};

