import type { ReactNode } from "react";
import { useState } from "react";
import { Search } from "@mui/icons-material";
import { AnimatePresence, motion } from "motion/react";
import {
    Box,
    TextField,
    InputAdornment,
    List,
    ListItem,
    useTheme,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { UntitledLogo } from "@/components/foundations/logo/untitledui-logo";
import { MobileNavigationHeader } from "../base-components/mobile-header";
import { NavAccountCard } from "../base-components/nav-account-card";
import { NavItemBase } from "../base-components/nav-item";
import { NavList } from "../base-components/nav-list";
import type { NavItemType } from "../config";

interface SidebarNavigationDualTierProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** Feature card to display. */
    featureCard?: ReactNode;
    /** List of items to display. */
    items: NavItemType[];
    /** List of footer items to display. */
    footerItems?: NavItemType[];
    /** Whether to hide the right side border. */
    hideBorder?: boolean;
}

// Styled components for Material UI integration
const MainSidebarContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxHeight: '100%',
    maxWidth: '100%',
    overflowY: 'auto',
    backgroundColor: theme.palette.background.paper,
    transition: 'width 300ms ease',
    borderRight: `1px solid ${theme.palette.divider}`,
    paddingTop: theme.spacing(3),
    [theme.breakpoints.up('lg')]: {
        width: 296,
        paddingTop: theme.spacing(4),
    },
}));

const SecondarySidebarContainer = styled(motion.div)(({ theme }) => ({
    position: 'relative',
    height: '100%',
    overflowX: 'hidden',
    overflowY: 'auto',
    backgroundColor: theme.palette.background.paper,
    borderRight: `1.5px solid ${theme.palette.divider}`,
}));

const DesktopNavigationContainer = styled(Box)(({ theme }) => ({
    position: 'fixed',
    zIndex: 50,
    top: 0,
    left: 0,
    bottom: 0,
    display: 'none',
    [theme.breakpoints.up('lg')]: {
        display: 'flex',
    },
}));

const PlaceholderContainer = styled(Box)(({ theme }) => ({
    visibility: 'hidden',
    display: 'none',
    position: 'sticky',
    top: 0,
    bottom: 0,
    left: 0,
    paddingLeft: 296,
    [theme.breakpoints.up('lg')]: {
        display: 'block',
    },
}));

export const SidebarNavigationDualTier = ({ activeUrl, hideBorder, items, footerItems = [], featureCard }: SidebarNavigationDualTierProps) => {
    const theme = useTheme();
    
    const activeItem = [...items, ...footerItems].find((item) => item.href === activeUrl || item.items?.some((subItem) => subItem.href === activeUrl));
    const [currentItem, setCurrentItem] = useState(activeItem || items[1]);
    const [isHovering, setIsHovering] = useState(false);

    const isSecondarySidebarVisible = isHovering && Boolean(currentItem.items?.length);

    const SECONDARY_SIDEBAR_WIDTH = 256;

    const mainSidebar = (
        <MainSidebarContainer
            sx={{
                borderRight: hideBorder && !isSecondarySidebarVisible ? 'none' : `1px solid ${theme.palette.divider}`
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, px: 3, [theme.breakpoints.up('lg')]: { px: 4 } }}>
                <UntitledLogo sx={{ height: 32 }} />
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
            </Box>

            <NavList activeUrl={activeUrl} items={items} className="lg:hidden" />

            <List sx={{ mt: 2, display: { xs: 'none', lg: 'flex' }, flexDirection: 'column', px: 3 }}>
                {items.map((item) => (
                    <ListItem key={item.label + item.href} sx={{ py: 0.5, px: 0 }}>
                        <NavItemBase
                            current={currentItem.href === item.href}
                            href={item.href}
                            badge={item.badge}
                            icon={item.icon}
                            type="link"
                            onClick={() => setCurrentItem(item)}
                        >
                            {item.label}
                        </NavItemBase>
                    </ListItem>
                ))}
            </List>
            
            <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 2, px: 2, py: 3, [theme.breakpoints.up('lg')]: { px: 3, py: 4 } }}>
                {footerItems.length > 0 && (
                    <List sx={{ display: 'flex', flexDirection: 'column', p: 0 }}>
                        {footerItems.map((item) => (
                            <ListItem key={item.label + item.href} sx={{ py: 0.5, px: 0 }}>
                                <NavItemBase
                                    current={currentItem.href === item.href}
                                    href={item.href}
                                    badge={item.badge}
                                    icon={item.icon}
                                    type="link"
                                    onClick={() => setCurrentItem(item)}
                                >
                                    {item.label}
                                </NavItemBase>
                            </ListItem>
                        ))}
                    </List>
                )}

                {featureCard}

                <NavAccountCard />
            </Box>
        </MainSidebarContainer>
    );

    const secondarySidebar = (
        <AnimatePresence initial={false}>
            {isSecondarySidebarVisible && (
                <SecondarySidebarContainer
                    initial={{ width: 0, borderColor: theme.palette.divider }}
                    animate={{ width: SECONDARY_SIDEBAR_WIDTH, borderColor: theme.palette.divider }}
                    exit={{
                        width: 0,
                        borderColor: 'rgba(0,0,0,0)',
                        transition: { borderColor: { type: "tween", delay: 0.05 } }
                    }}
                    transition={{ type: "spring", damping: 26, stiffness: 220, bounce: 0 }}
                    sx={{ borderRight: hideBorder ? 'none' : `1.5px solid ${theme.palette.divider}` }}
                >
                    <List sx={{ width: SECONDARY_SIDEBAR_WIDTH, height: '100%', display: 'flex', flexDirection: 'column', p: 3, py: 4 }}>
                        {currentItem.items?.map((item) => (
                            <ListItem key={item.label + item.href} sx={{ py: 0.5, px: 0 }}>
                                <NavItemBase
                                    current={activeUrl === item.href}
                                    href={item.href}
                                    icon={item.icon}
                                    badge={item.badge}
                                    type="link"
                                >
                                    {item.label}
                                </NavItemBase>
                            </ListItem>
                        ))}
                    </List>
                </SecondarySidebarContainer>
            )}
        </AnimatePresence>
    );

    return (
        <>
            {/* Mobile header navigation */}
            <MobileNavigationHeader>{mainSidebar}</MobileNavigationHeader>

            {/* Desktop sidebar navigation */}
            <DesktopNavigationContainer
                onPointerEnter={() => setIsHovering(true)}
                onPointerLeave={() => setIsHovering(false)}
            >
                {mainSidebar}
                {secondarySidebar}
            </DesktopNavigationContainer>

            {/* Placeholder to take up physical space because the real sidebar has `fixed` position. */}
            <PlaceholderContainer />
        </>
    );
};

