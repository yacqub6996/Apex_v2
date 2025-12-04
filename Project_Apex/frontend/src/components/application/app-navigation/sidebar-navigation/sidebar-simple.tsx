import type { ReactNode } from "react";
import { Search } from "@mui/icons-material";;
import { TextField, InputAdornment, Box } from "@mui/material";
import { UntitledLogo } from "@/components/foundations/logo/untitledui-logo";
import { cx } from "@/utils/cx";
import { MobileNavigationHeader } from "../base-components/mobile-header";
import { NavAccountCard } from "../base-components/nav-account-card";
import { NavItemBase } from "../base-components/nav-item";
import { NavList } from "../base-components/nav-list";
import type { NavItemType } from "../config";

interface SidebarNavigationProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** List of items to display. */
    items: NavItemType[];
    /** List of footer items to display. */
    footerItems?: NavItemType[];
    /** Feature card to display. */
    featureCard?: ReactNode;
    /** Whether to show the account card. */
    showAccountCard?: boolean;
    /** Whether to hide the right side border. */
    hideBorder?: boolean;
    /** Additional CSS classes to apply to the sidebar. */
    className?: string;
}

export const SidebarNavigationSimple = ({
    activeUrl,
    items,
    footerItems = [],
    featureCard,
    showAccountCard = true,
    hideBorder = false,
    className,
}: SidebarNavigationProps) => {
    const MAIN_SIDEBAR_WIDTH = 296;

    const content = (
        <Box
            component="aside"
            className={cx(
                "flex h-full w-full max-w-full flex-col justify-between overflow-auto bg-primary pt-4 lg:pt-6",
                !hideBorder && "border-secondary md:border-r",
                className,
            )}
            sx={{
                width: { lg: `${MAIN_SIDEBAR_WIDTH}px` },
            }}
        >
            <div className="flex flex-col gap-5 px-4 lg:px-5">
                <UntitledLogo className="h-8" />
                <TextField
                  size="small"
                  aria-label="Search"
                  placeholder="Search"
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
            </div>

            <NavList activeUrl={activeUrl} items={items} />

            <div className="mt-auto flex flex-col gap-4 px-2 py-4 lg:px-4 lg:py-6">
                {footerItems.length > 0 && (
                    <ul className="flex flex-col">
                        {footerItems.map((item) => (
                            <li key={item.label} className="py-0.5">
                                <NavItemBase badge={item.badge} icon={item.icon} href={item.href} type="link" current={item.href === activeUrl}>
                                    {item.label}
                                </NavItemBase>
                            </li>
                        ))}
                    </ul>
                )}

                {featureCard}

                {showAccountCard && <NavAccountCard />}
            </div>
        </Box>
    );

    return (
        <>
            {/* Mobile header navigation */}
            <MobileNavigationHeader>{content}</MobileNavigationHeader>

            {/* Desktop sidebar navigation */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex">{content}</div>

            {/* Placeholder to take up physical space because the real sidebar has `fixed` position. */}
            <Box
                className="invisible hidden lg:sticky lg:top-0 lg:bottom-0 lg:left-0 lg:block"
                sx={{
                    paddingLeft: { lg: `${MAIN_SIDEBAR_WIDTH}px` },
                }}
            />
        </>
    );
};

