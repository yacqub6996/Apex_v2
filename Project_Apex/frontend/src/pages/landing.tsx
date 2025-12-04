//
import type { ProgressFeaturedIconType, IconType } from "@/components/application/progress-steps/progress-types";
import { Header } from "@/components/marketing/header-navigation/header";
import { ProductFeaturesAIX } from "@/components/marketing/features/features-product-aix";
import { SocialProofCardBrand } from "@/components/marketing/social-proof/social-proof-card-brand";
import { FAQAccordion01Brand } from "@/components/marketing/faq/faq-accordion-01-brand";
import { CTAAbstractImagesBrand } from "@/components/marketing/cta/cta-abstract-images-brand";
import { TestimonialsRotating } from "@/components/marketing/testimonials/testimonials-rotating";
import { FooterLarge13Brand } from "@/components/marketing/footers/footer-large-13-brand";
import { ContentSectionSplitImage02 } from "@/components/marketing/content/content-section-split-image-02";
import { CheckItemText } from "@/components/marketing/pricing-sections/base-components/pricing-tier-card";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Groups, ShieldOutlined, TrendingUp } from "@mui/icons-material";
import { useAuth } from "@/providers/auth-provider";
import { CopyTradingService } from "@/api/services/CopyTradingService";
import { LongTermService } from "@/api/services/LongTermService";
import { Box, Chip, Divider, Link, Slider, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion, type Variants } from "framer-motion";
import { publicAsset } from "@/utils/public-asset";

// Color palette
const COLORS = {
  brandCyan: '#06b6d4',
  brandCyanDark: '#0891b2',
  black: '#080808',
  blackLight: '#121212',
  white: '#ffffff',
  textSecondary: '#c5c5c5',
  textTertiary: '#949494',
};

// Live social proof metrics (would be API calls in production)
const LIVE_USERS_COUNT = 1247;
const ACTIVE_TRADES_TODAY = 89;

// Reusable animation keyframes
const fadeInUpAnimation = {
  '@keyframes fadeInUp': {
    from: {
      opacity: 0,
      transform: 'translateY(20px)',
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
};

// Shared button styles
const baseButtonStyles = {
  px: 4,
  py: 2,
  fontSize: '1.125rem',
  fontWeight: 600,
  borderRadius: '12px',
  textDecoration: 'none',
  transition: 'all 0.3s ease',
  display: 'inline-block',
  cursor: 'pointer',
  '&:focus': {
    outline: '2px solid',
    outlineColor: COLORS.brandCyan,
    outlineOffset: '2px',
  },
};

// Shared gradient text style for headers on adaptive backgrounds
const adaptiveGradientTextStyle = {
  background: `linear-gradient(to right, var(--color-text-primary), var(--color-brand-600))`,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const ROI_CHART_DATA = [
  { label: 'Week 1', copy: 1.4, plans: 0.8 },
  { label: 'Week 2', copy: 2.2, plans: 1.2 },
  { label: 'Week 3', copy: 3.1, plans: 1.9 },
  { label: 'Week 4', copy: 3.6, plans: 2.3 },
];

const PERFORMANCE_SERIES: Record<string, { label: string; roi: number }[]> = {
  '30d': [
    { label: 'W1', roi: 0.6 },
    { label: 'W2', roi: 1.2 },
    { label: 'W3', roi: 2.4 },
    { label: 'W4', roi: 3.0 },
  ],
  ytd: [
    { label: 'Q1', roi: 4.1 },
    { label: 'Q2', roi: 7.4 },
    { label: 'Q3', roi: 12.9 },
    { label: 'Q4', roi: 15.2 },
  ],
};

const WALLET_SNAPSHOT = {
  main: { available: 5400, pending: 320, locked: 0 },
  copy: { available: 2100, pending: 180, locked: 250 },
  longterm: { available: 4300, pending: 220, locked: 900 },
} as const;

const TRADE_HISTORY = [
  { id: 'TR-1024', pair: 'ETH/USDT', type: 'Long', roi: '+3.8%', size: '$1,200', status: 'Filled' },
  { id: 'TR-1023', pair: 'SOL/USDT', type: 'Long', roi: '+2.4%', size: '$900', status: 'Filled' },
  { id: 'TR-1022', pair: 'BTC/USDT', type: 'Short', roi: '+1.1%', size: '$1,500', status: 'Filled' },
];

const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const PRIMARY_BG = 'var(--color-bg-primary, #080808)';

const HERO_VIDEO_SRC = publicAsset("assets/illustrations/new-hero_video.mp4");
const WIDGETS_VIDEO_SRC = publicAsset("images/widgets-main-video.hvc1.3010a527240f8051d301.mp4");

const SectionBlock = ({ id, children, className, innerClassName, bgColor = PRIMARY_BG }: { id?: string; children: ReactNode; className?: string; innerClassName?: string; bgColor?: string }) => (
  <motion.section
    id={id}
    className={`relative overflow-hidden ${className ?? ''}`}
    style={{ background: bgColor }}
    initial={{ opacity: 0, y: 18 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.25 }}
    transition={{ duration: 0.45, ease: 'easeOut' }}
  >
    <Box
      className="pointer-events-none absolute inset-x-0 top-0"
      sx={{ height: 72, background: `linear-gradient(to bottom, ${bgColor}, transparent)`, mixBlendMode: 'multiply', opacity: 0.9 }}
    />
    <Box
      className="pointer-events-none absolute inset-x-0 bottom-0"
      sx={{ height: 72, background: `linear-gradient(to top, ${bgColor}, transparent)`, mixBlendMode: 'multiply', opacity: 0.9 }}
    />
    <div className={`relative mx-auto max-w-container px-4 pb-8 pt-8 md:px-8 md:pb-10 md:pt-10 ${innerClassName ?? ''}`}>
      {children}
    </div>
  </motion.section>
);

const InteractiveOutcomes = () => {
  const [allocation, setAllocation] = useState(2500);
  const [walletKey, setWalletKey] = useState<'main' | 'copy' | 'longterm'>('copy');
  const wallet = WALLET_SNAPSHOT[walletKey];

  const guardrail = useMemo(() => ({
    maxDaily: Math.round(allocation * 0.1),
    pauseAt: Math.round(allocation * 0.15),
    estRoi: 1 + ((allocation - 500) / 4500) * 2, // scales from ~1% to ~3%
  }), [allocation]);

  return (
    <SectionBlock id="outcomes">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <span className="text-sm font-semibold text-brand-secondary md:text-md">Seamless User Experience</span>
        <Box
          component="h2"
          sx={{
            ...adaptiveGradientTextStyle,
            mt: 3,
            fontSize: { xs: '1.875rem', md: '2.25rem' },
            fontWeight: 600,
          }}
        >
          See results before you commit
        </Box>
        <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">Live-style snippets: Daily P&L tracking, ROI trajectory, allocation guardrails, and wallet clarity with projected unlock dates.</p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-[rgba(255,255,255,0.05)] bg-secondary p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-md font-semibold text-primary">ROI trajectory</p>
              <Chip size="small" label="Read-only demo" color="primary" variant="outlined" />
            </div>
            <p className="mt-2 text-sm text-tertiary">Hover to inspect copy trading vs long-term plans.</p>
            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ROI_CHART_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="roiCopy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.brandCyan} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS.brandCyan} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="roiPlans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7ae2ff" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#7ae2ff" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" stroke="#6b7280" tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: '#0b0b0b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
                    labelStyle={{ color: COLORS.textSecondary }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'ROI']}
                  />
                  <Area type="monotone" dataKey="copy" stroke={COLORS.brandCyan} fillOpacity={1} fill="url(#roiCopy)" />
                  <Area type="monotone" dataKey="plans" stroke="#7ae2ff" fillOpacity={1} fill="url(#roiPlans)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-[rgba(255,255,255,0.05)] bg-secondary p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-md font-semibold text-primary">Allocation & guardrails</p>
              <Chip size="small" label="Interactive" color="primary" variant="outlined" />
            </div>
            <p className="mt-2 text-sm text-tertiary">Drag to preview caps and pause thresholds.</p>
            <Box sx={{ mt: 4 }}>
              <Slider
                value={allocation}
                min={500}
                max={5000}
                step={100}
                onChange={(_, value) => setAllocation(value as number)}
                valueLabelDisplay="auto"
                valueLabelFormat={(val) => formatCurrency(val)}
                aria-label="Allocation"
              />
            </Box>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-primary px-3 py-3 ring-1 ring-[rgba(255,255,255,0.06)]">
                <p className="text-xs uppercase tracking-wide text-tertiary">Allocation</p>
                <p className="text-lg font-semibold text-primary">{formatCurrency(allocation)}</p>
              </div>
              <div className="rounded-2xl bg-primary px-3 py-3 ring-1 ring-[rgba(255,255,255,0.06)]">
                <p className="text-xs uppercase tracking-wide text-tertiary">Max daily draw</p>
                <p className="text-lg font-semibold text-primary">{formatCurrency(guardrail.maxDaily)}</p>
              </div>
              <div className="rounded-2xl bg-primary px-3 py-3 ring-1 ring-[rgba(255,255,255,0.06)]">
                <p className="text-xs uppercase tracking-wide text-tertiary">Auto-pause at</p>
                <p className="text-lg font-semibold text-primary">{formatCurrency(guardrail.pauseAt)}</p>
              </div>
              <div className="rounded-2xl bg-primary px-3 py-3 ring-1 ring-[rgba(255,255,255,0.06)]">
                <p className="text-xs uppercase tracking-wide text-tertiary">Est. monthly ROI</p>
                <p className="text-lg font-semibold text-primary">~{guardrail.estRoi.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[rgba(255,255,255,0.05)] bg-secondary p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-md font-semibold text-primary">Wallet clarity</p>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={walletKey}
                onChange={(_, val) => val && setWalletKey(val)}
                color="primary"
              >
                <ToggleButton value="main">Main</ToggleButton>
                <ToggleButton value="copy">Copy</ToggleButton>
                <ToggleButton value="longterm">Long-term</ToggleButton>
              </ToggleButtonGroup>
            </div>
            <p className="mt-2 text-sm text-tertiary">Spendable vs pending with locked amounts for plans.</p>

            <div className="mt-6 flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-2xl bg-primary px-3 py-3 ring-1 ring-[rgba(255,255,255,0.06)]">
                <span className="text-sm text-tertiary">Spendable</span>
                <span className="text-lg font-semibold text-primary">{formatCurrency(wallet.available)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-primary px-3 py-3 ring-1 ring-[rgba(255,255,255,0.06)]">
                <span className="text-sm text-tertiary">Pending</span>
                <span className="text-lg font-semibold text-primary">{formatCurrency(wallet.pending)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-primary px-3 py-3 ring-1 ring-[rgba(255,255,255,0.06)]">
                <span className="text-sm text-tertiary">Locked</span>
                <span className="text-lg font-semibold text-primary">{formatCurrency(wallet.locked)}</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-tertiary">Switch wallets to see how transfers and holds affect liquidity.</p>
          </div>
        </div>
    </SectionBlock>
  );
};

const howItWorksSteps: ProgressFeaturedIconType[] = [
  {
    title: "Choose a vetted trader",
    description: "Verify a trader code or browse profiles.",
    status: "complete",
    icon: Groups as unknown as IconType,
  },
  {
    title: "Set allocation & guardrails",
    description: "Pick amount, caps and pause rules.",
    status: "current",
    icon: ShieldOutlined as unknown as IconType,
  },
  {
    title: "Copy trades automatically",
    description: "Mirrored entries with ROI in your dashboard.",
    status: "incomplete",
    icon: TrendingUp as unknown as IconType,
  },
];

const stepVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' as const },
  }),
};

const HowItWorksSection = () => {
  const { user } = useAuth();
  return (
    <SectionBlock id="how-it-works">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <Box
            component="h2"
            sx={{
              ...adaptiveGradientTextStyle,
              fontSize: { xs: '1.875rem', md: '2.25rem' },
              fontWeight: 600,
            }}
          >
            How copy trading works
          </Box>
          <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">Stacked steps that animate into view as you scroll.</p>
        </div>

        <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-4 md:mt-10 md:gap-5">
          {howItWorksSteps.map((step, index) => (
            <motion.div
              key={step.title}
              className="relative overflow-hidden rounded-2xl bg-secondary p-5 ring-1 ring-[rgba(255,255,255,0.05)]"
              variants={stepVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.35 }}
              custom={index}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-brand-primary ring-1 ring-[rgba(255,255,255,0.07)]">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-primary">Step {index + 1}</p>
                  <p className="text-lg font-semibold text-primary">{step.title}</p>
                  <p className="mt-1 text-sm text-tertiary">{step.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href={user?.id ? "/dashboard/copy-trading" : "/signup"}
            className="text-md font-semibold text-brand-primary hover:underline"
          >
            Start copy trading
          </a>
        </div>
    </SectionBlock>
  );
};

const PerformanceSection = () => {
  const [range, setRange] = useState<'30d' | 'ytd'>('30d');
  const series = PERFORMANCE_SERIES[range];

  const averageRoi = useMemo(() => series.reduce((sum, point) => sum + point.roi, 0) / series.length, [series]);
  const bestRoi = useMemo(() => Math.max(...series.map((point) => point.roi)), [series]);

  return (
    <SectionBlock id="performance">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <span className="text-sm font-semibold text-brand-secondary md:text-md">Performance</span>
          <Box
            component="h2"
            sx={{
              ...adaptiveGradientTextStyle,
              mt: 3,
              fontSize: { xs: '1.875rem', md: '2.25rem' },
              fontWeight: 600,
            }}
          >
            Toggle ROI windows
          </Box>
          <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">Switch between 30D and YTD to see how returns compound.</p>
        </div>

        <div className="mt-10 rounded-3xl border border-[rgba(255,255,255,0.05)] bg-secondary p-6 shadow-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-md font-semibold text-primary">ROI timeline</p>
              <p className="text-sm text-tertiary">Live-style view pulled from demo data.</p>
            </div>
            <ToggleButtonGroup
              exclusive
              value={range}
              onChange={(_, val) => val && setRange(val)}
              size="small"
              color="primary"
            >
              <ToggleButton value="30d">Last 30 days</ToggleButton>
              <ToggleButton value="ytd">Year to date</ToggleButton>
            </ToggleButtonGroup>
          </div>

          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="performance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.brandCyan} stopOpacity={0.7} />
                    <stop offset="95%" stopColor={COLORS.brandCyan} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" stroke="#6b7280" tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: '#0b0b0b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
                  labelStyle={{ color: COLORS.textSecondary }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'ROI']}
                />
                <Area type="monotone" dataKey="roi" stroke={COLORS.brandCyan} fillOpacity={1} fill="url(#performance)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-primary px-3 py-3 ring-1 ring-[rgba(255,255,255,0.06)]">
              <p className="text-xs uppercase tracking-wide text-tertiary">Average ROI</p>
              <p className="text-lg font-semibold text-primary">{averageRoi.toFixed(1)}%</p>
              <p className="text-xs text-tertiary">Across the selected window.</p>
            </div>
            <div className="rounded-2xl bg-primary px-3 py-3 ring-1 ring-[rgba(255,255,255,0.06)]">
              <p className="text-xs uppercase tracking-wide text-tertiary">Peak ROI</p>
              <p className="text-lg font-semibold text-primary">{bestRoi.toFixed(1)}%</p>
              <p className="text-xs text-tertiary">Best period within this view.</p>
            </div>
            <div className="rounded-2xl bg-primary px-3 py-3 ring-1 ring-[rgba(255,255,255,0.06)]">
              <p className="text-xs uppercase tracking-wide text-tertiary">Exports</p>
              <p className="text-lg font-semibold text-primary">CSV and PDF ready</p>
              <p className="text-xs text-tertiary">Matches dashboard analytics.</p>
            </div>
          </div>
        </div>
    </SectionBlock>
  );
};

const PricingMirrorSection = () => {
  const plansQuery = useQuery({
    queryKey: ["landing-long-term-plans"],
    queryFn: async () => (await LongTermService.longTermListPublicLongTermPlans()).data,
  });

  const fallbackPlans = [
    { id: "foundation", tier: "FOUNDATION", description: "Entry-level plan with steady, conservative returns", minimum_deposit: 5000, maximum_deposit: 15000 },
    { id: "growth", tier: "GROWTH", description: "Balanced growth strategy with moderate risk", minimum_deposit: 15000, maximum_deposit: 50000 },
    { id: "elite", tier: "ELITE", description: "Premium plan targeting aggressive growth", minimum_deposit: 50000, maximum_deposit: 200000 },
  ];

  const plans = plansQuery.data && plansQuery.data.length ? plansQuery.data : fallbackPlans;

  const renderFeatures = (tier: string) => {
    switch (tier) {
      case "FOUNDATION":
        return [
          "Auto-rebalancing (daily)",
          "Add funds anytime - no lock-in",
          "View projected unlock dates",
          "Asset classes: FX majors, BTC/ETH, index ETFs",
          "Leverage up to 1.5x",
          "1 trader profile",
        ];
      case "GROWTH":
        return [
          "Auto-rebalancing (intra-day)",
          "Add funds anytime - flexible unlock dates",
          "Daily P&L tracking dashboard",
          "Asset classes: FX, crypto, commodities, equities",
          "Leverage up to 2.5x",
          "Up to 3 trader profiles",
        ];
      case "ELITE":
      default:
        return [
          "Priority execution & desk support",
          "Add funds anytime + custom unlock schedules",
          "Real-time execution feed",
          "Asset classes: multi-asset incl. derivatives",
          "Leverage up to 4x",
          "Unlimited trader profiles",
        ];
    }
  };

  return (
    <SectionBlock id="pricing">
      <div className="mx-auto mb-12 flex w-full max-w-3xl flex-col items-center text-center">
          <p className="text-sm font-semibold text-brand-secondary md:text-md">Pricing</p>
          <Box
            component="h2"
            sx={{
              ...adaptiveGradientTextStyle,
              mt: 3,
              fontSize: { xs: '2.25rem', md: '3rem' },
              fontWeight: 600,
            }}
          >
            Long-term plans
          </Box>
          <p className="mt-4 text-lg text-tertiary md:mt-6 md:text-xl">Foundation, Growth and Elite tiers - same structure as your dashboard.</p>
        </div>

        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
          {plans.map((plan) => {
            const tierLabel = (plan.tier ?? "").toString().toUpperCase() || "FOUNDATION";
            const displayMin = plan.minimum_deposit;
            const displayMax = plan.maximum_deposit;
            const features = renderFeatures(tierLabel);
            return (
              <div key={plan.id} className="flex flex-col overflow-hidden rounded-3xl bg-primary shadow-xl ring-1 ring-[rgba(255,255,255,0.05)] hover:shadow-2xl transition">
                <div className="flex items-center gap-2 px-7 pt-7 md:px-9">
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold tracking-wide text-primary uppercase">{tierLabel}</span>
                  {tierLabel === "GROWTH" && (
                    <span className="rounded-full bg-brand-solid px-2.5 py-1 text-xs font-semibold tracking-wide text-white">Most popular</span>
                  )}
                </div>

                <div className="px-7 pt-4 text-center md:px-9">
                  {typeof displayMin === "number" && (
                    <p className="text-lg font-semibold text-primary">Minimum {formatCurrency(displayMin)}</p>
                  )}
                  {typeof displayMax === "number" && (
                    <p className="text-lg font-semibold text-primary">Maximum {formatCurrency(displayMax)}</p>
                  )}
                  <p className="mt-3 text-md text-tertiary">{plan.description}</p>
                </div>

                <div className="mx-7 my-6 border-t border-[rgba(255,255,255,0.05)] md:mx-9" />

                <ul className="flex flex-col gap-4 px-7 pb-7 md:px-9 md:pb-9">
                  {features.map((feat) => (
                    <CheckItemText key={feat} iconStyle="outlined" color="primary" text={feat} />
                  ))}
                </ul>

                <div className="mx-7 border-t border-[rgba(255,255,255,0.05)] md:mx-9" />

                <div className="px-7 py-7 text-center md:px-9">
                  <a href="/plans" className="text-md font-semibold text-brand-primary hover:underline">Get started</a>
                </div>
              </div>
            );
          })}
        </div>
    </SectionBlock>
  );
};

const CopyTradingOverview = () => {
  const { user } = useAuth();
  const [selectedTrade, setSelectedTrade] = useState(TRADE_HISTORY[0].id);
  const [multiplier, setMultiplier] = useState(1.2);

  const activeTrade = useMemo(() => TRADE_HISTORY.find((trade) => trade.id === selectedTrade) || TRADE_HISTORY[0], [selectedTrade]);

  return (
    <SectionBlock id="copy-trading">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <span className="text-sm font-semibold text-brand-secondary md:text-md">Automated Wealth Growth</span>
          <Box
            component="h2"
            sx={{
              ...adaptiveGradientTextStyle,
              mt: 3,
              fontSize: { xs: '1.875rem', md: '2.25rem' },
              fontWeight: 600,
            }}
          >
            Mirror Pro Traders with Complete Control
          </Box>
          <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">Pause anytime, view 6-month history, adjust copy size, and watch automated ROI calculations flow into your dashboard.</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-[rgba(255,255,255,0.05)] bg-secondary p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-md font-semibold text-primary">Recent fills (demo)</p>
              <Stack direction="row" spacing={1}>
                <Chip size="small" label="Pause anytime" color="success" variant="outlined" />
                <Chip size="small" label="Vetted trader" color="primary" variant="outlined" />
              </Stack>
            </div>
            <p className="mt-2 text-sm text-tertiary">View 6-month history · Tap a fill to preview details and ROI.</p>

            <div className="mt-4 flex flex-col gap-3">
              {TRADE_HISTORY.map((trade) => (
                <button
                  key={trade.id}
                  onClick={() => setSelectedTrade(trade.id)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                    selectedTrade === trade.id ? 'bg-primary ring-1 ring-[rgba(6,182,212,0.3)]' : 'bg-primary/40 hover:bg-primary'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-primary">{trade.pair}</p>
                    <p className="text-xs text-tertiary">{trade.type} - {trade.id}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-brand-primary">{trade.roi}</span>
                    <span className="text-xs rounded-full bg-primary px-2 py-1 text-tertiary ring-1 ring-[rgba(255,255,255,0.05)]">{trade.size}</span>
                  </div>
                </button>
              ))}
            </div>

            <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.08)' }} />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-tertiary">Status</p>
                <p className="text-lg font-semibold text-primary">{activeTrade.status}</p>
              </div>
              <div>
                <p className="text-sm text-tertiary">ROI</p>
                <p className="text-lg font-semibold text-primary">{activeTrade.roi}</p>
              </div>
              <div>
                <p className="text-sm text-tertiary">Size</p>
                <p className="text-lg font-semibold text-primary">{activeTrade.size}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[rgba(255,255,255,0.05)] bg-secondary p-6 shadow-lg">
            <p className="text-md font-semibold text-primary">Guardrails you set</p>
            <p className="mt-2 text-sm text-tertiary">Adjust copy multiplier and see caps update live.</p>

            <Stack spacing={3} sx={{ mt: 3 }}>
              <div>
                <p className="text-xs uppercase tracking-wide text-tertiary">Copy size multiplier</p>
                <Slider
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={multiplier}
                  valueLabelDisplay="auto"
                  onChange={(_, val) => setMultiplier(val as number)}
                  aria-label="Copy size multiplier"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-primary px-3 py-3 ring-1 ring-[rgba(255,255,255,0.06)]">
                  <p className="text-xs uppercase tracking-wide text-tertiary">Cap per trade</p>
                  <p className="text-lg font-semibold text-primary">{formatCurrency(Math.round(800 * multiplier))}</p>
                  <p className="text-xs text-tertiary">Stops at 1.5x risk when volatility spikes.</p>
                </div>
                <div className="rounded-2xl bg-primary px-3 py-3 ring-1 ring-[rgba(255,255,255,0.06)]">
                  <p className="text-xs uppercase tracking-wide text-tertiary">Auto-pause</p>
                  <p className="text-lg font-semibold text-primary">{formatCurrency(Math.round(1200 * multiplier))}</p>
                  <p className="text-xs text-tertiary">Triggers after 2 red trades or -7% day.</p>
                </div>
                <div className="rounded-2xl bg-primary px-3 py-3 ring-1 ring-[rgba(255,255,255,0.06)]">
                  <p className="text-xs uppercase tracking-wide text-tertiary">Daily ROI glide</p>
                  <p className="text-lg font-semibold text-primary">~{(1.4 * multiplier).toFixed(1)}%</p>
                  <p className="text-xs text-tertiary">Feeds into performance exports.</p>
                </div>
                <div className="rounded-2xl bg-primary px-3 py-3 ring-1 ring-[rgba(255,255,255,0.06)]">
                  <p className="text-xs uppercase tracking-wide text-tertiary">Rebalance target</p>
                  <p className="text-lg font-semibold text-primary">{formatCurrency(Math.round(5000 * multiplier))}</p>
                  <p className="text-xs text-tertiary">Auto-moves gains back to main wallet.</p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-primary px-4 py-3 ring-1 ring-[rgba(255,255,255,0.06)]">
                <span className="text-sm text-tertiary">Sync to dashboard exports</span>
                <Chip size="small" label="On" color="primary" />
              </div>
            </Stack>

            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm text-tertiary">ROI flows into: Dashboard / Exports / Taxes</span>
              <Link href={user?.id ? "/dashboard/copy-trading" : "/signup"} className="text-md font-semibold text-brand-primary hover:underline">
                {user?.id ? 'Go to dashboard' : 'Start copying'}
              </Link>
            </div>
          </div>
        </div>
    </SectionBlock>
  );
};

const Hero = () => {
  const { user } = useAuth();
  
  const copiedQuery = useQuery({
    queryKey: ["copied-traders", user?.id],
    queryFn: async () => {
      const res = await CopyTradingService.copyTradingListCopiedTraders(0, 100);
      return res.data;
    },
    enabled: !!user?.id,
  });
  const copiedCount = Array.isArray(copiedQuery.data) ? copiedQuery.data.length : 0;

  return (
    <Box
      component="section"
      id="hero"
      sx={{
        position: 'relative',
        background: `radial-gradient(ellipse at 50% 50%, ${COLORS.blackLight} 0%, ${COLORS.black} 100%)`,
        py: { xs: 6, md: 10 },
        overflow: 'hidden',
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Video Background */}
      <Box
        component="video"
        autoPlay
        loop
        muted
        playsInline
        src={HERO_VIDEO_SRC}
        poster={HERO_VIDEO_SRC}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          opacity: 0.4,
        }}
      >
        <source src={HERO_VIDEO_SRC} type="video/mp4" />
      </Box>
      {/* Dark overlay for better text readability */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.8) 100%)`,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div className="relative z-10 mx-auto flex w-full max-w-container flex-col items-center px-4 text-center md:px-8">
        <Box
          component="span"
          sx={{
            fontSize: { xs: '0.875rem', md: '1rem' },
            fontWeight: 600,
            color: COLORS.brandCyan,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Automated Wealth Growth
        </Box>
        <Box
          component="h1"
          sx={{
            mt: 2,
            fontSize: { xs: '2.25rem', md: '4rem', lg: '5.5rem' },
            fontWeight: 700,
            lineHeight: 1.1,
            background: `linear-gradient(to right, ${COLORS.white}, ${COLORS.brandCyan})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'fadeInUp 0.8s ease-out',
            ...fadeInUpAnimation,
          }}
        >
          Grow Your Portfolio While You Sleep
        </Box>
        <Box
          component="p"
          sx={{
            mt: 4,
            maxWidth: '48rem',
            fontSize: { xs: '1.125rem', md: '1.25rem' },
            color: COLORS.textSecondary,
            animation: 'fadeInUp 0.8s ease-out 0.2s backwards',
            ...fadeInUpAnimation,
          }}
        >
          Mirror vetted traders automatically or choose AI-managed long-term plans. Average 8-12% monthly ROI with as little as $500 to start. Pause anytime, withdraw freely.
        </Box>
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            mt: { xs: 8, md: 10 },
            display: 'flex',
            width: { xs: '100%', sm: 'auto' },
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'flex-start' },
            gap: 4,
            animation: 'fadeInUp 0.8s ease-out 0.4s backwards',
            ...fadeInUpAnimation,
          }}
        >
          <Link
            href="/signup"
            sx={{
              ...baseButtonStyles,
              background: `linear-gradient(135deg, ${COLORS.brandCyan}, ${COLORS.brandCyanDark})`,
              color: COLORS.white,
              boxShadow: `0 4px 20px rgba(6, 182, 212, 0.3)`,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `0 6px 30px rgba(6, 182, 212, 0.4)`,
              },
            }}
          >
            Start Earning Today
          </Link>
          <Link
            href="#outcomes"
            sx={{
              ...baseButtonStyles,
              border: 'none',
              backgroundColor: 'transparent',
              color: COLORS.textSecondary,
              px: 2,
              '&:hover': {
                backgroundColor: 'transparent',
                color: COLORS.brandCyan,
                transform: 'translateY(-2px)',
              },
            }}
          >
            See Live ROI Demo
          </Link>
        </Box>
        {user?.id && copiedQuery.isSuccess && (
          <Box
            component="p"
            sx={{
              mt: 6,
              fontSize: '0.875rem',
              color: COLORS.textTertiary,
            }}
          >
            You're copying {copiedCount} trader{copiedCount === 1 ? "" : "s"}. <Link href="/dashboard/copy-trading" sx={{ fontWeight: 600, color: COLORS.brandCyan }}>Manage</Link>
          </Box>
        )}
        
        {/* Live social proof indicators */}
        {!user?.id && (
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            sx={{ 
              mt: 4,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Chip 
              icon={<Groups />}
              label={`${LIVE_USERS_COUNT.toLocaleString()} active investors`} 
              size="small" 
              sx={{ 
                bgcolor: 'rgba(6, 182, 212, 0.1)', 
                color: COLORS.brandCyan,
                border: '1px solid rgba(6, 182, 212, 0.3)',
              }} 
            />
            <Chip 
              icon={<TrendingUp />}
              label={`${ACTIVE_TRADES_TODAY} trades today`} 
              size="small" 
              sx={{ 
                bgcolor: 'rgba(6, 182, 212, 0.1)', 
                color: COLORS.brandCyan,
                border: '1px solid rgba(6, 182, 212, 0.3)',
              }} 
            />
          </Stack>
        )}
      </div>
    </Box>
  );
};

const LandingPage = () => {
  return (
    <div>
      <Header isSticky />
      <main>
        <Hero />
        <SectionBlock id="partners">
          <SocialProofCardBrand />
        </SectionBlock>
        <InteractiveOutcomes />
        <SectionBlock id="features">
          <ProductFeaturesAIX />
        </SectionBlock>
        <CopyTradingOverview />
        <PerformanceSection />
        {/* Widgets video - secondary full-width reel */}
        <SectionBlock id="reel-widgets">
          <Box
            sx={{
              maxWidth: '1400px',
              mx: 'auto',
              px: { xs: 2, md: 4 },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(6, 182, 212, 0.25)',
                border: '1px solid rgba(6, 182, 212, 0.1)',
                minHeight: { xs: 220, md: 260 },
                background: 'radial-gradient(circle at 20% 20%, rgba(6,182,212,0.14), transparent 40%), linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.08))',
              }}
            >
              <video
                src={WIDGETS_VIDEO_SRC}
                className="w-full h-auto block"
                muted
                loop
                playsInline
                autoPlay
                aria-label="Widgets overview"
                poster={WIDGETS_VIDEO_SRC}
              >
                <source src={WIDGETS_VIDEO_SRC} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <Box
                className="pointer-events-none absolute inset-0"
                sx={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.55))' }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  px: { xs: 2.5, md: 4 },
                  py: { xs: 2, md: 3 },
                  pointerEvents: 'none',
                  color: COLORS.white,
                }}
              >
                <Chip
                  label="Live reel"
                  size="small"
                  color="info"
                  sx={{ bgcolor: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.4)', color: '#e0f7ff' }}
                />
              </Box>
            </Box>
          </Box>
        </SectionBlock>

        <HowItWorksSection />
        <PricingMirrorSection />
        <SectionBlock id="testimonials">
          <TestimonialsRotating />
        </SectionBlock>
        <SectionBlock id="faq">
          <FAQAccordion01Brand />
        </SectionBlock>
        <SectionBlock id="security">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
            <span className="text-sm font-semibold text-brand-secondary md:text-md">Secure & Compliant Platform</span>
            <Box
              component="h2"
              sx={{
                ...adaptiveGradientTextStyle,
                mt: 3,
                fontSize: { xs: '1.875rem', md: '2.25rem' },
                fontWeight: 600,
              }}
            >
              Trust & Control: You Own Everything
            </Box>
            <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">Bank-grade security, regulatory compliance, and complete transparency.</p>
          </div>
          
          {/* Three Trust Pillars */}
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-secondary p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-brand-primary ring-1 ring-[rgba(255,255,255,0.07)] mx-auto">
                <ShieldOutlined className="h-6 w-6" />
              </div>
              <p className="text-md font-semibold text-primary text-center mt-4">Non-Custodial</p>
              <p className="mt-2 text-sm text-tertiary text-center">You retain full control of funds. Revoke access anytime. Pause or stop copy trading instantly.</p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-secondary p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-brand-primary ring-1 ring-[rgba(255,255,255,0.07)] mx-auto">
                <TrendingUp className="h-6 w-6" />
              </div>
              <p className="text-md font-semibold text-primary text-center mt-4">Bank-Grade Security</p>
              <p className="mt-2 text-sm text-tertiary text-center">TLS 1.3 encryption in transit, AES-256 at rest, scoped API keys, and comprehensive audit logs.</p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-secondary p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-brand-primary ring-1 ring-[rgba(255,255,255,0.07)] mx-auto">
                <Groups className="h-6 w-6" />
              </div>
              <p className="text-md font-semibold text-primary text-center mt-4">Regulatory Compliance</p>
              <p className="mt-2 text-sm text-tertiary text-center">Full KYC/AML verification, transparent fee structure, and compliant crypto deposit networks (BEP20, ERC20, TRC20).</p>
            </div>
          </div>

          {/* KYC Process Overview */}
          <Box sx={{ mt: 8, textAlign: 'center', px: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
              Simple KYC Verification Process
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
              Upload documents → Automated verification (24-48 hours) → Start trading
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Government ID + proof of address required · Bank-grade encryption
            </Typography>
          </Box>

          {/* Crypto Networks */}
          <div className="mt-8 rounded-2xl border border-[rgba(255,255,255,0.05)] bg-secondary p-6">
            <p className="text-md font-semibold text-primary text-center">Supported Deposit Networks</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Chip label="BEP20 (Binance Smart Chain)" size="small" color="primary" variant="outlined" />
              <Chip label="ERC20 (Ethereum)" size="small" color="primary" variant="outlined" />
              <Chip label="TRC20 (Tron)" size="small" color="primary" variant="outlined" />
              <Chip label="Bitcoin Network" size="small" color="primary" variant="outlined" />
            </div>
          </div>

          <div className="mt-10 text-center">
            <a href="/kyc" className="text-md font-semibold text-brand-primary hover:underline">Start Verification →</a>
          </div>
        </SectionBlock>
        <SectionBlock id="about">
          <ContentSectionSplitImage02 />
        </SectionBlock>
        <SectionBlock id="cta">
          <CTAAbstractImagesBrand />
        </SectionBlock>
        <SectionBlock id="contact" innerClassName="pb-0">
          <FooterLarge13Brand />
        </SectionBlock>
      </main>
    </div>
  );
};

export default LandingPage;


