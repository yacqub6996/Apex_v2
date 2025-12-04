import { publicAsset } from "@/utils/public-asset";

const FALLBACK_LOGO = publicAsset("images/Tech Trading Platform Logo - Apex, Wordmark Style.svg");

const LOGOS = [
    { alt: "Catalog Logo", src: "https://www.untitledui.com/logos/logotype/white/catalog.svg" },
    { alt: "Pictelai Logo", src: "https://www.untitledui.com/logos/logotype/white/pictelai.svg" },
    { alt: "Leapyear Logo", src: "https://www.untitledui.com/logos/logotype/white/leapyear.svg" },
    { alt: "Peregrin Logo", src: "https://www.untitledui.com/logos/logotype/white/peregrin.svg" },
    { alt: "Easytax Logo", src: "https://www.untitledui.com/logos/logotype/white/easytax.svg" },
    { alt: "Coreos Logo", src: "https://www.untitledui.com/logos/logotype/white/coreos.svg" },
];

export const SocialProofCardBrand = () => {
    return (
        <div className="w-full">
            <style>
                {`
                @keyframes logo-ticker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .logo-ticker-track { animation: none !important; }
                }
            `}
            </style>
            <div className="flex flex-col gap-6 rounded-2xl bg-brand-section px-6 py-10 md:px-12 md:py-14">
                <p className="text-center text-md font-medium text-tertiary_on-brand md:text-xl">
                    Trusted by investors and trading teams who need transparency and control
                </p>
                <div className="relative overflow-hidden">
                    <div
                        className="logo-ticker-track flex min-w-max items-center gap-10 md:gap-16"
                        style={{ animation: "logo-ticker 22s linear infinite" }}
                    >
                        {[...LOGOS, ...LOGOS].map((logo, idx) => (
                            <img
                                key={`${logo.alt}-${idx}`}
                                alt={logo.alt}
                                src={logo.src}
                                className="h-9 opacity-90 md:h-12"
                                style={{ filter: "brightness(0) invert(1)" }}
                                loading="lazy"
                                onError={(e) => (e.currentTarget.src = FALLBACK_LOGO)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


