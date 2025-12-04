import { Groups, TrendingUp, Timeline, AssessmentOutlined, AccountBalanceWallet, VerifiedUser } from "@mui/icons-material";
import { FeatureTextFeaturedIconTopCenteredBrand } from "@/components/marketing/features/base-components/feature-text";

const productFeatures = [
  {
    title: "Copy trading guardrails",
    subtitle: "Per-trade visibility, allocation caps, and pause/resume/reduce/stop controls.",
    icon: Groups,
  },
  {
    title: "Structured long-term plans",
    subtitle: "Foundation, Growth, Elite with clear min/max ranges and easy upgrades.",
    icon: Timeline,
  },
  {
    title: "Unified ROI & reporting",
    subtitle: "Dashboard views and exports across copy trading and plans.",
    icon: AssessmentOutlined,
  },
  {
    title: "Wallets & transfers",
    subtitle: "Main, Copy Trading, and Long-Term wallets with spendable vs pending clarity.",
    icon: AccountBalanceWallet,
  },
  {
    title: "KYC & compliance",
    subtitle: "Document verification for withdrawals and account protections.",
    icon: VerifiedUser,
  },
  {
    title: "Scale with confidence",
    subtitle: "Guardrails and monitoring so you can allocate more safely.",
    icon: TrendingUp,
  },
];

export const ProductFeaturesAIX = () => {
  return (
    <section className="bg-brand-section py-6 md:py-10">
      <div className="mx-auto max-w-container px-4 md:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <span className="text-sm font-semibold text-secondary_on-brand md:text-md">Benefits</span>
          <h2 className="mt-3 text-display-sm font-semibold text-primary_on-brand md:text-display-md">Built for clarity and control</h2>
          <p className="mt-4 text-lg text-secondary_on-brand md:mt-5 md:text-xl">
            Copy trading plus structured long-term plans, protected by guardrails and compliant workflows.
          </p>
        </div>

        <div className="mt-12 md:mt-16">
          <ul className="grid w-full grid-cols-1 justify-items-center gap-x-8 gap-y-10 sm:grid-cols-2 md:gap-y-16 lg:grid-cols-3">
            {productFeatures.map((item) => (
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

