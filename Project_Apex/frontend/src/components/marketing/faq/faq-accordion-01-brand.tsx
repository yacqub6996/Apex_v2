import { useState } from "react";
import { CreditCard, Description, Favorite, Mail, Block, SwapHoriz } from "@mui/icons-material";
import { motion } from "motion/react";
import { Avatar } from "@mui/material";
import Button from '@mui/material/Button';
import { cx } from "@/utils/cx";

const faqsExtended = [
    {
        question: "How do I get started?",
        answer: "Sign up, verify your email, complete KYC to enable withdrawals, fund your main wallet, then allocate to copy trading or a plan.",
        icon: Favorite,
    },
    {
        question: "What are the minimums for plans?",
        answer: "Foundation: $5,000–$15,000. Growth: $15,000–$50,000. Elite: $50,000–$200,000. Upgrade without closing positions.",
        icon: CreditCard,
    },
    {
        question: "Do I need KYC?",
        answer: "KYC is required for withdrawals. You can fund and allocate before KYC approval, but withdrawals stay pending until approved.",
        icon: Description,
    },
    {
        question: "Can I pause or adjust copy trading?",
        answer: "Yes. Pause/resume instantly, reduce allocation, or stop. Reductions and stops return funds to your Copy Trading Wallet.",
        icon: Block,
    },
    {
        question: "How are funds moved?",
        answer: "Deposit to your main wallet, move to Copy Trading or Long-Term. Withdrawals are KYC-gated and show pending/cleared status.",
        icon: SwapHoriz,
    },
    {
        question: "Where do I see performance?",
        answer: "Dashboard ROI by period (30D/YTD/SI), active copy positions, trade history, and exports cover both copy trading and plans.",
        icon: Mail,
    },
];

export const FAQAccordion01Brand = () => {
    const [openQuestions, setOpenQuestions] = useState(new Set([0]));

    const handleToggle = (index: number) => {
        openQuestions.has(index) ? openQuestions.delete(index) : openQuestions.add(index);
        setOpenQuestions(new Set(openQuestions));
    };

    return (
        <section className="bg-brand-section py-6 md:py-10">
            <div className="mx-auto max-w-container px-4 md:px-8">
                <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
                    <h2 className="text-display-sm font-semibold text-primary_on-brand md:text-display-md">Frequently asked questions</h2>
                    <p className="mt-4 text-lg text-tertiary_on-brand md:mt-5 md:text-xl">Key details on getting started, funding, controls, and withdrawals.</p>
                </div>

                <div className="mx-auto mt-12 max-w-3xl md:mt-16">
                    <div className="flex flex-col gap-8">
                        {faqsExtended.map((faq, index) => (
                            <div key={faq.question} className="not-first:-mt-px not-first:border-t not-first:border-brand_alt not-first:pt-6">
                                <h3>
                                    <button
                                        onClick={() => handleToggle(index)}
                                        className="flex w-full cursor-pointer items-start justify-between gap-2 rounded-md text-left outline-focus-ring select-none focus-visible:outline-2 focus-visible:outline-offset-2 md:gap-6"
                                    >
                                        <span className="text-md font-semibold text-primary_on-brand">{faq.question}</span>

                                        <span aria-hidden="true" className="flex size-6 items-center text-icon-fg-brand_on-brand">
                                            <svg
                                                width="24"
                                                height="24"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <line
                                                    className={cx(
                                                        "origin-center rotate-0 transition duration-150 ease-out",
                                                        openQuestions.has(index) && "-rotate-90",
                                                    )}
                                                    x1="12"
                                                    y1="8"
                                                    x2="12"
                                                    y2="16"
                                                ></line>
                                                <line x1="8" y1="12" x2="16" y2="12"></line>
                                            </svg>
                                        </span>
                                    </button>
                                </h3>

                                <motion.div
                                    className="overflow-hidden"
                                    initial={false}
                                    animate={{
                                        height: openQuestions.has(index) ? "auto" : 0,
                                        opacity: openQuestions.has(index) ? 1 : 0,
                                    }}
                                    transition={{
                                        type: "spring",
                                        damping: 24,
                                        stiffness: 240,
                                        bounce: 0.4,
                                    }}
                                >
                                    <div className="pt-1 pr-8 md:pr-12">
                                        <p className="text-md text-tertiary_on-brand">{faq.answer}</p>
                                    </div>
                                </motion.div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-12 flex flex-col items-center gap-6 rounded-2xl bg-brand-section_subtle px-6 py-8 text-center md:mt-16 md:gap-8 md:pt-8 md:pb-10">
                    <div className="flex items-end -space-x-4">
                        <Avatar
                            src="https://www.untitledui.com/images/avatars/marco-kelly?fm=webp&q=80"
                            alt="Marco Kelly"
                            sx={{
                                width: 56,
                                height: 56,
                                border: '1.5px solid white'
                            }}
                        />
                        <Avatar
                            src="https://www.untitledui.com/images/avatars/amelie-laurent?fm=webp&q=80"
                            alt="Amelie Laurent"
                            sx={{
                                width: 80,
                                height: 80,
                                border: '1.5px solid white',
                                zIndex: 10
                            }}
                        />
                        <Avatar
                            src="https://www.untitledui.com/images/avatars/jaya-willis?fm=webp&q=80"
                            alt="Jaya Willis"
                            sx={{
                                width: 56,
                                height: 56,
                                border: '1.5px solid white'
                            }}
                        />
                    </div>
                    <div>
                        <h4 className="text-xl font-semibold text-primary_on-brand">Still have questions?</h4>
                        <p className="mt-2 text-md text-tertiary_on-brand md:text-lg">
                            Can't find the answer you're looking for? Please chat to our friendly team.
                        </p>
                    </div>
                    <Button size="large">Get in touch</Button>
                </div>
            </div>
        </section>
    );
};
